"use client";

// ── Google Photorealistic 3D Tiles spike (pure Three.js) ────────────
//
// research/3d-city-spike branch only. MapLibre removed entirely per
// founder spec 2026-05-23 — clean Three.js scene with OrbitControls,
// no basemap. Confirms the 3d-tiles-renderer pipeline end-to-end
// without any MapLibre integration friction.
//
// Camera starts 800 m directly above Business Bay along the local
// ENU "up" vector. OrbitControls let the user drag to rotate and
// scroll to zoom — the lookat point stays pinned to the ground
// point at Business Bay.

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { TilesRenderer } from "3d-tiles-renderer";
import { GoogleCloudAuthPlugin } from "3d-tiles-renderer/plugins";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const TILESET_URL = `https://tile.googleapis.com/v1/3dtiles/root.json?key=${API_KEY}`;

// Business Bay in WGS84 → ECEF. Standard spherical-Earth approximation
// (WGS84 ellipsoid would be a tiny refinement; the tileset has its own
// precise geometry so this single anchor only needs to be roughly
// right). lat/lng converted to radians for the trig.
const LAT_RAD = (25.1865 * Math.PI) / 180;
const LNG_RAD = (55.2708 * Math.PI) / 180;
const EARTH_R = 6_378_137; // metres, WGS84 equatorial radius

const groundX = EARTH_R * Math.cos(LAT_RAD) * Math.cos(LNG_RAD);
const groundY = EARTH_R * Math.cos(LAT_RAD) * Math.sin(LNG_RAD);
const groundZ = EARTH_R * Math.sin(LAT_RAD);

export default function SpikePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    console.log("[3d-spike] pure-Three mount — API key length:", API_KEY.length);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // sky blue

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      1,
      1e8,
    );
    // Local ENU "up" at Business Bay — the outward-pointing normal of
    // the sphere at this point. Camera starts 800 m along this axis.
    const up = new THREE.Vector3(
      Math.cos(LAT_RAD) * Math.cos(LNG_RAD),
      Math.cos(LAT_RAD) * Math.sin(LNG_RAD),
      Math.sin(LAT_RAD),
    ).normalize();
    const ground = new THREE.Vector3(groundX, groundY, groundZ);
    camera.up.copy(up); // set BEFORE lookAt so orientation is exact
    camera.position.copy(ground).addScaledVector(up, 800);
    camera.lookAt(ground);

    const controls = new OrbitControls(camera, canvas);
    controls.target.copy(ground);
    controls.enableDamping = true; // makes scroll/drag feel less abrupt
    controls.update();

    const tiles = new TilesRenderer(TILESET_URL);
    tiles.registerPlugin(new GoogleCloudAuthPlugin({ apiToken: API_KEY }));
    tiles.setCamera(camera);
    tiles.setResolutionFromRenderer(camera, renderer);
    scene.add(tiles.group);

    tiles.addEventListener("load-tile-set", () => {
      console.log("[3d-spike] load-tile-set fired");
    });
    let lastChildCount = 0;
    tiles.addEventListener("tiles-load-end", () => {
      const n = tiles.group.children.length;
      if (n !== lastChildCount) {
        console.log("[3d-spike] tiles loaded — children:", n);
        lastChildCount = n;
      }
    });

    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      tiles.setCamera(camera);
      tiles.setResolutionFromRenderer(camera, renderer);
      tiles.update();
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      tiles.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", position: "relative" }}>
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          zIndex: 10,
          background: "rgba(0,0,0,0.6)",
          color: "white",
          padding: "8px 12px",
          borderRadius: 8,
          fontSize: 12,
          fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif',
          lineHeight: 1.5,
          pointerEvents: "none",
        }}
      >
        3D CITY SPIKE · BUSINESS BAY<br />
        © Google · 3D Tiles<br />
        Drag to rotate · Scroll to zoom
      </div>
      <canvas ref={canvasRef} style={{ display: "block", width: "100vw", height: "100vh" }} />
    </div>
  );
}
