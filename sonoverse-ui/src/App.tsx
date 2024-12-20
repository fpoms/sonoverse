import { useState, useRef, useEffect } from 'react'
import './App.css'
import { Canvas, useFrame, ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'
import { rotate } from 'three/tsl'
import axios from 'axios'


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

function Grid() {
  const ref = useRef<THREE.Mesh>(null!)
  const [hovered, hover] = useState(false)
  const [clicked, click] = useState(false)
  const [geometry, setGeometry] = useState<THREE.BufferGeometry>(new THREE.SphereGeometry(3));

  useEffect(() => {
    axios.get('http://127.0.0.1:5000/api/grid')
      .then(response => {
        const data = response.data;
        const geometry = new THREE.BufferGeometry();
        const indices = data.indices;
        const vertices = new Float32Array(data.vertices);
        geometry.setIndex( indices );
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        setGeometry(geometry);
      })
      .catch(error => {
        console.error(error);
      });
  }, []);

  return (
    <mesh
      ref={ref}
      scale={clicked ? 1.5 : 1}
      onClick={(event) => click(!clicked)}
      onPointerOver={(event) => hover(true)}
      onPointerOut={(event) => hover(false)}
      geometry={geometry}>
      <meshStandardMaterial color={hovered ? 'hotpink' : 'orange'} wireframe={true} />
    </mesh>
  )
}

interface PointerProps {
  leftClicked: boolean;
  middleClicked: boolean;
};

function Pointer(props: PointerProps) {
  const isRotating = useRef<boolean>(false);
  const rotateStartPointer = useRef<THREE.Vector2>();
  const endPointerDiff = useRef<THREE.Vector2>(new THREE.Vector2(0, 0));

  useFrame((state, delta) => {
    if (props.leftClicked && !(isRotating.current)) {
      rotateStartPointer.current = new THREE.Vector2(state.pointer.x, state.pointer.y);
      isRotating.current = true;
    }

    const target = new THREE.Vector3(0, 0, 0);
    const cameraOffset = new THREE.Vector3(10, 10, 10);
    if (isRotating.current) {
      if (rotateStartPointer.current === undefined || endPointerDiff.current === undefined) {
        throw new Error;
      }
      const xPointerDiff = -(state.pointer.x - rotateStartPointer.current.x) + endPointerDiff.current.x;
      const yPointerDiff = -(state.pointer.y - rotateStartPointer.current.y) + endPointerDiff.current.y;

      if (!props.leftClicked) {
        isRotating.current = false;
        endPointerDiff.current = new THREE.Vector2(xPointerDiff, yPointerDiff);
      } else {
        state.camera.position.x = cameraOffset.x * (Math.sin(xPointerDiff)) * Math.cos(yPointerDiff);
        state.camera.position.y = cameraOffset.y * (Math.sin(yPointerDiff));
        state.camera.position.z = cameraOffset.z * (Math.cos(xPointerDiff)) * Math.cos(yPointerDiff);
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
  const [leftClicked, leftClick] = useState(false);
  const [middleClicked, middleClick] = useState(false);
  return (
    <div style={{width: "90vw", height: "90vh"}}>
      <Canvas 
       onMouseDown={(event) => {
        if (event.button == 0) {
            leftClick(true);
        } else if (event.button == 1) {
            middleClick(true);
        }}}
       onMouseUp={(event) => {
        leftClick(false);
        middleClick(false);
        }} 
        onMouseOut={(event) => {
          leftClick(false);
          middleClick(false);
          }} >
        <ambientLight intensity={Math.PI / 2} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} decay={0} intensity={Math.PI} />
        <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />
        <Grid/>
        <axesHelper args={[5]} />
        <Pointer leftClicked={leftClicked} middleClicked={middleClicked}/>
      </Canvas>
    </div>
  )
}

export default App
