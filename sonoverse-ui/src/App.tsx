import { useState, useRef } from 'react'
import './App.css'
import { Canvas, useFrame, ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'
import { rotate } from 'three/tsl'


function Box(props: ThreeElements['mesh']) {
  const ref = useRef<THREE.Mesh>(null!)
  const [hovered, hover] = useState(false)
  const [clicked, click] = useState(false)
  const [time, setTime] = useState(0)
  const origPos = useRef<THREE.Vector3 | undefined>(undefined);
  useFrame((state, delta) => {
    if (origPos.current === undefined) {
      origPos.current = new THREE.Vector3(
        ref.current.position.x, 
        ref.current.position.y,
        ref.current.position.z
      );
    }
    setTime(time + delta);
  })
  return (
    <mesh
      {...props}
      ref={ref}
      scale={clicked ? 1.5 : 1}
      onClick={(event) => click(!clicked)}
      onPointerOver={(event) => hover(true)}
      onPointerOut={(event) => hover(false)}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={hovered ? 'hotpink' : 'orange'} />
    </mesh>
  )
}

interface PointerProps {
  clicked: boolean;
};

function Pointer(props: PointerProps) {
  const isRotating = useRef<boolean>(false);
  const rotateStartPointer = useRef<THREE.Vector2>();
  const endPointerDiff = useRef<THREE.Vector2>(new THREE.Vector2(0, 0));

  useFrame((state, delta) => {
    if (props.clicked && !(isRotating.current)) {
      rotateStartPointer.current = new THREE.Vector2(state.pointer.x, state.pointer.y);
      isRotating.current = true;
    }

    const target = new THREE.Vector3(0, 0, 0);
    const cameraOffset = new THREE.Vector3(10, 10, 10);
    if (isRotating.current) {
      if (rotateStartPointer.current === undefined || endPointerDiff.current === undefined) {
        throw new Error;
      }
      const xPointerDiff = (state.pointer.x - rotateStartPointer.current.x) + endPointerDiff.current.x;
      const yPointerDiff = (state.pointer.y - rotateStartPointer.current.y) + endPointerDiff.current.y;

      if (!props.clicked) {
        isRotating.current = false;
        endPointerDiff.current = new THREE.Vector2(xPointerDiff, yPointerDiff);
      } else {
        state.camera.position.x = cameraOffset.x * (Math.sin(xPointerDiff));;
        state.camera.position.y = cameraOffset.y;
        state.camera.position.z = cameraOffset.z * (Math.cos(xPointerDiff));
        console.log(state.camera.position)
        state.camera.lookAt(target.x, target.y, target.z);
      }
    }
  })


  return (
    <></>
  )
}

function App() {
  const [clicked, click] = useState(false)
  return (
    <div style={{width: "100vw", height: "100vh"}}>
      <Canvas onMouseDown={(event) => click(true)} onMouseUp={(event) => click(false)} onMouseOut={(event) => click(false)}>
        <ambientLight intensity={Math.PI / 2} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} decay={0} intensity={Math.PI} />
        <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />
        <Box position={[-1.2, 0, 0]} />
        <Box position={[1.2, 0, 0]} />
        <Box position={[0, -1.2, 0]} />
        <axesHelper args={[5]} />
        <Pointer clicked={clicked}/>
      </Canvas>
    </div>
  )
}

export default App
