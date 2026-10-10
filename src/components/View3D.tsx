import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { buildFloor, FLOOR_HEIGHT } from "../render/house3d";
import type { HouseDesign } from "../engine/types";
import type { InteriorStyle } from "../engine/interior";
import { Segmented, cx } from "./ui";

type Cam = "orbit" | "top" | "eye";

export default function View3D({ design, floor, style, selected, onSelect, className }: {
  design: HouseDesign; floor: number; style: InteriorStyle; selected?: string | null; onSelect?: (id: string | null) => void; className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [cam, setCam] = useState<Cam>("orbit");
  const [cutaway, setCutaway] = useState(true);
  const [failed, setFailed] = useState(false);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;
  const pickRef = useRef<THREE.Mesh[]>([]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); }
    catch { setFailed(true); return; }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#EEF0EC");
    const { plot, footprint: fp } = design;
    const cx0 = fp.x + fp.w / 2, cz0 = fp.y + fp.h / 2;

    // site: plot, lawn and road
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(plot.w + 40, plot.h + 40), new THREE.MeshStandardMaterial({ color: "#DCE3D3", roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(plot.x + plot.w / 2, -1.01, plot.y + plot.h / 2); ground.receiveShadow = true; scene.add(ground);
    const site = new THREE.Mesh(new THREE.PlaneGeometry(plot.w, plot.h), new THREE.MeshStandardMaterial({ color: "#E7E4DA", roughness: 1 }));
    site.rotation.x = -Math.PI / 2; site.position.set(plot.x + plot.w / 2, -0.99, plot.y + plot.h / 2); site.receiveShadow = true; scene.add(site);
    const f = design.input.facing;
    const roadW = 20;
    const road = new THREE.Mesh(new THREE.PlaneGeometry(f === "N" || f === "S" ? plot.w + 40 : roadW, f === "N" || f === "S" ? roadW : plot.h + 40), new THREE.MeshStandardMaterial({ color: "#8E9297", roughness: 0.95 }));
    road.rotation.x = -Math.PI / 2;
    road.position.set(f === "E" ? plot.x + plot.w + roadW / 2 : f === "W" ? plot.x - roadW / 2 : plot.x + plot.w / 2, -0.98, f === "N" ? plot.y - roadW / 2 : f === "S" ? plot.y + plot.h + roadW / 2 : plot.y + plot.h / 2);
    road.receiveShadow = true; scene.add(road);

    // floors: everything up to the selected level
    const pick: THREE.Mesh[] = [];
    for (let k = 0; k <= Math.min(floor, design.floors.length - 1); k++) {
      const isTop = k === floor;
      const { group, pickables } = buildFloor(design, design.floors[k], style, k, { cutaway: isTop && cutaway && cam !== "eye", furniture: isTop || cam === "eye" });
      scene.add(group);
      if (isTop) pick.push(...pickables);
    }
    pickRef.current = pick;

    // light: soft sky plus morning sun from the east-south-east
    scene.add(new THREE.HemisphereLight("#FFFFFF", "#B8B2A4", 1.15));
    const sun = new THREE.DirectionalLight("#FFF4E0", 2.2);
    sun.position.set(cx0 + 60, 90, cz0 + 25);
    sun.target.position.set(cx0, 0, cz0);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const ext = Math.max(plot.w, plot.h);
    Object.assign(sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 1, far: 300 });
    sun.shadow.bias = -0.0008;
    scene.add(sun, sun.target);

    const camera = new THREE.PerspectiveCamera(cam === "eye" ? 72 : 40, 1, 0.3, 1000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = cam === "eye" ? Math.PI * 0.62 : Math.PI * 0.47;
    const y0 = floor * FLOOR_HEIGHT;
    if (cam === "top") { camera.position.set(cx0, y0 + ext * 2.1, cz0 + 0.01); controls.target.set(cx0, y0, cz0); }
    else if (cam === "eye") {
      const main = design.floors[0].openings.find((o) => o.kind === "main");
      const mx = main ? (main.x1 + main.x2) / 2 : cx0, mz = main ? (main.y1 + main.y2) / 2 : fp.y;
      const dir = new THREE.Vector3(cx0 - mx, 0, cz0 - mz).normalize();
      const eyeBase = floor === 0 ? 0 : y0;
      camera.position.set(mx + dir.x * 4, eyeBase + 5.2, mz + dir.z * 4);
      controls.target.set(mx + dir.x * 14, eyeBase + 4.2, mz + dir.z * 14);
      controls.minDistance = 0.5; controls.maxDistance = 30;
    } else { camera.position.set(cx0 + ext * 0.95, y0 + ext * 1.05, cz0 + ext * 1.25); controls.target.set(cx0, y0 + 1, cz0); }
    controls.update();

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = "100%"; renderer.domElement.style.height = "100%";
      camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(el);

    // click a floor to select that room
    const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
    let down = { x: 0, y: 0 };
    const onDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY }; };
    const onUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
      const r = renderer.domElement.getBoundingClientRect();
      ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ptr, camera);
      const hit = ray.intersectObjects(pickRef.current, false)[0];
      selectRef.current?.(hit ? (hit.object.userData.roomId as string) : null);
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);

    let raf = 0;
    const tick = () => { controls.update(); renderer.render(scene, camera); raf = requestAnimationFrame(tick); };
    tick();
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      scene.traverse((o) => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()); } });
      renderer.dispose(); renderer.domElement.remove();
    };
  }, [design, floor, style, cam, cutaway]);

  // highlight the selected room's floor
  useEffect(() => {
    for (const m of pickRef.current) {
      const mm = m.material as THREE.MeshStandardMaterial;
      mm.emissive = new THREE.Color(m.userData.roomId === selected ? "#1E3DCB" : "#000000");
      mm.emissiveIntensity = m.userData.roomId === selected ? 0.35 : 0;
    }
  });

  if (failed) return <div className={cx("flex items-center justify-center bg-white p-8 text-center text-muted ring-1 ring-line", className)}>3D needs WebGL, which this browser has turned off. The plan view shows the same layout.</div>;
  return (
    <div className={cx("overflow-hidden ring-1 ring-line", className ?? "relative")}>
      <div ref={host} className="h-full w-full touch-none" aria-label="3D model of the house. Drag to rotate, scroll or pinch to zoom." role="img" />
      <div className="no-print absolute left-3 top-3 flex flex-wrap items-center gap-2">
        <Segmented label="Camera" value={cam} onChange={setCam} options={[{ value: "orbit", label: "Around" }, { value: "top", label: "Top" }, { value: "eye", label: "Walk in" }]} />
        {cam !== "eye" && <Segmented label="Walls" value={cutaway ? "cut" : "full"} onChange={(v) => setCutaway(v === "cut")} options={[{ value: "cut", label: "Cut-away" }, { value: "full", label: "Full walls" }]} />}
      </div>
      <p className="pointer-events-none absolute bottom-3 left-3 bg-white/90 px-2 py-1 text-[12px] text-muted">{cam === "eye" ? "You are standing inside the main door. Drag to look around." : "Drag to rotate. Scroll or pinch to zoom. Tap a room."}</p>
    </div>
  );
}
