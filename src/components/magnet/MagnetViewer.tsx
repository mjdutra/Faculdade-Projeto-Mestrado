import { Suspense, useRef } from "react";
import { Canvas} from "@react-three/fiber";
import { useGLTF, OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";

function MagnetModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const ref = useRef<THREE.Group>(null);

  return <primitive ref={ref} object={scene} scale={1.5} />;
}

function Fallback() {
  return null;
}

export function MagnetViewer({
  modelUrl,
  className,
  preserveDrawingBuffer = false,
}: {
  modelUrl: string;
  className?: string;
  preserveDrawingBuffer?: boolean;

  
}) {

  
  return (
    <div className={className} style={{ width: "100%", height: "100%" }}>
      <Canvas 
      camera={{ position: [0, 0, 5], fov: 45 }} 
      gl={{ antialias: true, preserveDrawingBuffer }}
      style={{ background: "transparent" }}>

        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 3, 3]} intensity={15} />
        <Suspense fallback={<Fallback />}>
          <MagnetModel url={modelUrl} />
          <Environment preset="city" />
        </Suspense>
        <OrbitControls 
            enableZoom={false}
            //enablePan={false}
            rotateSpeed={0.4}
            enableDamping
            dampingFactor={0.08}
            // minPolarAngle={Math.PI / 2}
            // maxPolarAngle={Math.PI / 2} 
            />
      </Canvas>
    </div>
  );
}
