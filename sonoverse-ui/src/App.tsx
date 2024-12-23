import { useState, useRef, useEffect } from 'react'
import './App.css'
import { Canvas, useFrame, ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'
import {min, max} from 'lodash';
import axios from 'axios'
import { OrbitControls } from '@react-three/drei'


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
  const planeMeshRef = useRef<THREE.MeshBasicMaterial>(null!)
  const [hovered, hover] = useState(false)
  const [clicked, click] = useState(false)
  const [geometry, setGeometry] = useState<THREE.BufferGeometry>(new THREE.SphereGeometry(3));
  const [texture, setTexture] = useState<THREE.DataTexture>(new THREE.DataTexture(null, 200, 200));
  const [planeSize, setPlaneSize] = useState<number[]>([0, 0]);


  const RGB_Log_Blend=(p,c0,c1)=>{
    const i=parseInt,r=Math.round,P=1-p,[a,b,c,d]=c0.split(","),[e,f,g,h]=c1.split(","),x=d||h,j=x?","+(!d?h:!h?d:r((parseFloat(d)*P+parseFloat(h)*p)*1000)/1000+")"):")";
    return"rgb"+(x?"a(":"(")+r((P*i(a[3]=="a"?a.slice(5):a.slice(4))**2+p*i(e[3]=="a"?e.slice(5):e.slice(4))**2)**0.5)+","+r((P*i(b)**2+p*i(f)**2)**0.5)+","+r((P*i(c)**2+p*i(g)**2)**0.5)+j;
  }


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

        // Texture
        const width = data.evaluated.width;
        const height = data.evaluated.height;

        setPlaneSize([data.evaluated.x_bounds[1] - data.evaluated.x_bounds[0],
                      data.evaluated.y_bounds[1] - data.evaluated.y_bounds[0]]);

        const rawData: number[] = data.evaluated.result.map(v => v == 'nan' ? 0 : +v);
        const size = width * height;
        const texData = new Uint8Array( 4 * size );
        const arrayMin: number = min(rawData) ?? 0;
        const arrayRange: number = (max(rawData) ?? 0) - arrayMin;

        const color7 = "rgb(0,0,0, 255)";
        const color8 = "rgba(200,30,20, 255)";

        for ( let i = 0; i < size; i ++ ) {
          const stride = i * 4;

          const val = (rawData[i] - arrayMin)/arrayRange;
          const color = new THREE.Color(RGB_Log_Blend(val, color7, color8));
          
          texData[ stride ] = color.r * 255;
          texData[ stride + 1 ] = color.g * 255;
          texData[ stride + 2 ] = color.b * 255;
          texData[ stride + 3 ] = 255;
        }

        // used the buffer to create a DataTexture
        const texture = new THREE.DataTexture( texData, width, height );
        texture.needsUpdate = true;
        setTexture(texture);
      })
      .catch(error => {
        console.error(error);
      });
  }, []);

  return (
    <>
      <mesh
        ref={ref}
        onClick={(event) => click(!clicked)}
        onPointerOver={(event) => hover(true)}
        onPointerOut={(event) => hover(false)}
        geometry={geometry}>
        <meshStandardMaterial color={hovered ? 'hotpink' : 'orange'} wireframe={true} />
      </mesh>
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI/2]}>
        <planeGeometry args={planeSize}/>
        <meshBasicMaterial ref={planeMeshRef} attach="material" map={texture} />
      </mesh>
    </>
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
        {//<Pointer leftClicked={leftClicked} middleClicked={middleClicked}/>}
}
        <OrbitControls />
      </Canvas>
    </div>
  )
}

export default App
