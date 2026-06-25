import * as THREE from "three";
import ThreeGlobe from "three-globe";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const HEX_COLOR = () => "rgba(64, 200, 255, 0.55)";
const POINT_HOT = "#ffcf5c";
const POINT_COOL = "#5fe1ff";
const ARC_COLOR = (t) => `rgba(124, 92, 255, ${0.65 * (1 - t) + 0.2})`;
const RING_COLOR = (t) => `rgba(120, 220, 255, ${1 - t})`;

export class Globe {
  constructor(canvas) {
    this.canvas = canvas;
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, alpha: true, powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x020308, 0.0018);
    this.camera = new THREE.PerspectiveCamera(34, w / h, 0.1, 2000);
    this.camera.position.set(0, 30, 360);

    this.scene.add(new THREE.AmbientLight(0x6699cc, 0.8));
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(1, 1, 1);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x3366ff, 0.8);
    rim.position.set(-1, -0.5, -1);
    this.scene.add(rim);

    this.group = new THREE.Group();
    this.group.rotation.y = -1.4;
    this.group.rotation.x = 0.35;
    this.scene.add(this.group);

    this._buildStarfield();
    this._buildGlobe();

    this._composerSetup(w, h);

    this._drag = { active: false, x: 0, y: 0 };
    this._spin = 0.12;
    this._pointer = { x: 0, y: 0.1 };
    this._bindEvents();
  }

  _buildStarfield() {
    const N = 1200;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 600 + Math.random() * 300;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      pos[i * 3 + 2] = r * Math.cos(ph);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x8fb4ff, size: 1.4, sizeAttenuation: true,
      transparent: true, opacity: 0.7, depthWrite: false,
    });
    this.scene.add(new THREE.Points(geo, mat));
  }

  _buildGlobe() {
    this.tg = new ThreeGlobe({ animateIn: true });
    this.tg.showAtmosphere(true)
      .atmosphereColor("#3da9ff")
      .atmosphereAltitude(0.16);
    const mat = this.tg.globeMaterial();
    mat.color = new THREE.Color(0x040912);
    mat.emissive = new THREE.Color(0x02060e);
    mat.shininess = 8;
    this.group.add(this.tg);

    fetch("/geo/countries.geojson")
      .then((r) => r.json())
      .then((geo) => {
        this.tg.hexPolygonsData(geo.features)
          .hexPolygonResolution(3)
          .hexPolygonMargin(0.18)
          .hexPolygonColor(HEX_COLOR)
          .hexPolygonUseDots(false);
      })
      .catch((e) => console.warn("geojson load failed", e));

    this.tg.pointsData([])
      .pointAltitude(0.006)
      .pointColor("color")
      .pointRadius("radius")
      .pointResolution(8);
    this.tg.ringsData([])
      .ringColor(RING_COLOR)
      .ringMaxRadius("maxR")
      .ringPropagationSpeed(3)
      .ringRepeatPeriod(1100);
    this.tg.arcsData([])
      .arcColor(ARC_COLOR)
      .arcAltitudeAutoScale(0.5)
      .arcDashLength(0.5)
      .arcDashGap(1.5)
      .arcDashInitialGap(() => Math.random())
      .arcDashAnimateTime(2200)
      .arcStroke(0.35);
  }

  setPoints(points) {
    if (!points || !points.length) {
      this.tg.pointsData([]).ringsData([]).arcsData([]);
      return;
    }
    const counts = points.map((p) => p.count || 1);
    const maxC = Math.max(...counts, 1);
    const minC = Math.min(...counts, 1);
    const norm = (c) => (maxC === minC ? 0.8 : (c - minC) / (maxC - minC));

    const data = points.map((p) => {
      const n = norm(p.count || 1);
      return {
        lat: p.lat, lng: p.lon, count: p.count || 1,
        color: n > 0.5 ? POINT_HOT : POINT_COOL,
        radius: 0.35 + n * 0.7,
        maxR: 2 + n * 4,
      };
    });
    this.tg.pointsData(data)
      .pointLat("lat").pointLng("lon");
    this.tg.ringsData(data)
      .ringLat("lat").ringLng("lon");

    const sorted = [...points].sort((a, b) => (b.count || 1) - (a.count || 1));
    const hubs = sorted.slice(0, Math.min(2, sorted.length));
    const targets = sorted.slice(1, 5);
    const arcs = [];
    hubs.forEach((h) => targets.forEach((t) => arcs.push({
      startLat: h.lat, startLng: h.lon, endLat: t.lat, endLng: t.lon,
    })));
    this.tg.arcsData(arcs);
  }

  _bindEvents() {
    const el = this.canvas;
    el.addEventListener("pointerdown", (e) => {
      this._drag.active = true;
      this._drag.x = e.clientX;
      this._drag.y = e.clientY;
    });
    window.addEventListener("pointerup", () => (this._drag.active = false));
    window.addEventListener("pointermove", (e) => {
      if (this._drag.active) {
        const dx = e.clientX - this._drag.x;
        const dy = e.clientY - this._drag.y;
        this.group.rotation.y += dx * 0.005;
        this.group.rotation.x = Math.max(-1.1, Math.min(1.1, this.group.rotation.x + dy * 0.005));
        this._drag.x = e.clientX;
        this._drag.y = e.clientY;
      }
      this._pointer.x = (e.clientX / window.innerWidth - 0.5) * 0.25;
      this._pointer.y = (e.clientY / window.innerHeight - 0.5) * 0.18;
    });
  }

  update(dt) {
    if (!this._drag.active) this.group.rotation.y += this._spin * dt;
    this.camera.position.x += (this._pointer.x * 50 - this.camera.position.x) * Math.min(1, dt * 1.5);
    this.camera.position.y += (this._pointer.y * 50 + 30 - this.camera.position.y) * Math.min(1, dt * 1.5);
    this.camera.lookAt(0, 0, 0);
  }

  _composerSetup(w, h) {
    this.composer = new EffectComposer(this.renderer);
    this.composer.setSize(w, h);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(w, h), 0.8, 0.7, 0.15));
    this.composer.addPass(new OutputPass());
  }

  render() {
    this.composer.render();
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
  }
}
