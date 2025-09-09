import React, { Suspense, useEffect, useState } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Bounds,
  Environment,
  Grid,
  ContactShadows,
} from "@react-three/drei";
import { STLLoader, OBJLoader, ThreeMFLoader } from "three-stdlib";
import styles from "./ModelPreview.module.css"; // <-- CSS Module corretto

type Props = { file: File };

// Inquadra automaticamente l’oggetto dentro la camera
function AutoFit({ children }: { children: React.ReactNode }) {
  return (
    <Bounds clip observe margin={1.25}>
      {children}
    </Bounds>
  );
}

const LoadedModel: React.FC<{ file: File }> = ({ file }) => {
  const [object, setObject] = useState<THREE.Group | null>(null);

  useEffect(() => {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    const url = URL.createObjectURL(file);

    let loader: any;
    if (ext === "stl") loader = new STLLoader();
    if (ext === "obj") loader = new OBJLoader();
    if (ext === "3mf") loader = new ThreeMFLoader();
    if (!loader) return;

    if (ext === "stl") {
      // STL: leggiamo in ArrayBuffer e calcoliamo le normali per smoothing
      const reader = new FileReader();
      reader.onload = (e) => {
        const contents = e.target?.result;
        if (!contents) return;
        const geom = loader.parse(contents as ArrayBuffer) as THREE.BufferGeometry;
        if (!geom.getAttribute("normal")) geom.computeVertexNormals();
        geom.computeBoundingSphere();

        const mesh = new THREE.Mesh(
          geom,
          new THREE.MeshStandardMaterial({
            color: "#b0c4ff",
            roughness: 0.55,
            metalness: 0.05,
          })
        );
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const group = new THREE.Group();
        group.add(mesh);
        setObject(group);
      };
      reader.readAsArrayBuffer(file);
    } else {
      // OBJ/3MF: carichiamo via URL e assicuriamo normali/materiale
      loader.load(
        url,
        (obj: THREE.Group) => {
          obj.traverse((c: any) => {
            if (c.isMesh) {
              c.castShadow = true;
              c.receiveShadow = true;
              if (c.geometry && !c.geometry.getAttribute("normal")) {
                c.geometry.computeVertexNormals();
              }
              if (!c.material || Array.isArray(c.material)) {
                c.material = new THREE.MeshStandardMaterial({
                  color: "#b0c4ff",
                  roughness: 0.55,
                  metalness: 0.05,
                });
              }
            }
          });
          setObject(obj);
        },
        undefined,
        () => {
          setObject(new THREE.Group());
        }
      );
    }

    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!object) return null;
  return <primitive object={object} />;
};

const ModelPreview: React.FC<Props> = ({ file }) => {
  const ext = file.name.split(".").pop()?.toLowerCase();
  const supported = ["stl", "obj", "3mf"].includes(ext || "");
  if (!supported) {
    return (
      <div style={{ padding: 12, color: "#bbb" }}>
        Formato non supportato per la preview ({ext}).
      </div>
    );
  }

  // dpr dinamico: nitido su retina, più leggero su schermi normali
  const dpr: [number, number] = [1, Math.min(2, window.devicePixelRatio || 1)];

  return (
    <div className={styles.viewport}>
      <Canvas
        className={styles.canvas}
        dpr={dpr}
        shadows
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          logarithmicDepthBuffer: true,
          toneMapping: THREE.ACESFilmicToneMapping,
        }}
        camera={{ position: [2.5, 2, 2.5], fov: 45, near: 0.01, far: 100 }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x0b0b0c); // background scuro neutro
          gl.toneMappingExposure = 1.0;
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        {/* Luci più “realistiche” */}
        <hemisphereLight intensity={0.4} groundColor={"#222"} />
        <directionalLight
          position={[5, 8, 5]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <ambientLight intensity={0.2} />

        <Suspense fallback={null}>
          <AutoFit>
            <LoadedModel file={file} />
          </AutoFit>

          {/* Ambiente “studio” per riflessioni morbide */}
          <Environment preset="studio" />

          {/* Piano di appoggio */}
          <ContactShadows
            position={[0, -0.4, 0]}
            opacity={0.55}
            blur={2.4}
            far={10}
            resolution={1024}
            frames={1}
          />

          {/* Griglia sottile, utile come riferimento */}
          <Grid
            args={[10, 10]}
            cellSize={0.25}
            cellThickness={0.5}
            sectionColor="#3e3e3e"
            sectionSize={1}
            sectionThickness={1}
            infiniteGrid
          />
        </Suspense>

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.06}
          minDistance={0.5}
          maxDistance={15}
        />
      </Canvas>
    </div>
  );
};

export default ModelPreview;
