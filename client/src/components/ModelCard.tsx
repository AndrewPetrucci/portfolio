import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { Box3, Mesh, Vector3 } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js'
import type { Group, MeshStandardMaterial, Object3D } from 'three'
import { useCarouselActive } from './carouselActive'
import './ModelCard.css'

const TEST_MODEL_URL = '/bulbasaur.glb'

function readAccent() {
  return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#11ff00'
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function meshBox(root: Object3D) {
  const box = new Box3()
  root.updateWorldMatrix(true, true)
  root.traverse((obj) => {
    if (!(obj instanceof Mesh) || !obj.geometry) return
    const geometry = obj.geometry
    if (!geometry.boundingBox) geometry.computeBoundingBox()
    if (!geometry.boundingBox) return
    box.union(geometry.boundingBox.clone().applyMatrix4(obj.matrixWorld))
  })
  return box
}

function fitModel(root: Group) {
  let box = meshBox(root)
  if (box.isEmpty()) box = new Box3().setFromObject(root, true)
  if (box.isEmpty()) return

  const size = box.getSize(new Vector3())
  const scale = 1.35 / Math.max(size.x, size.y, size.z, 0.0001)
  root.scale.setScalar(scale)

  box = meshBox(root)
  if (box.isEmpty()) box = new Box3().setFromObject(root, true)
  if (box.isEmpty()) return
  root.position.sub(box.getCenter(new Vector3()))
}

function flattenShading(root: Object3D) {
  root.traverse((obj) => {
    if (!(obj instanceof Mesh)) return
    obj.castShadow = false
    obj.receiveShadow = false
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
    for (const mat of mats) {
      if (!mat) continue
      if ('metalness' in mat) mat.metalness = 0
      if ('roughness' in mat) mat.roughness = 1
      if ('envMapIntensity' in mat) mat.envMapIntensity = 0
    }
  })
}

function AccentSculpture() {
  const material = useRef<MeshStandardMaterial>(null)
  const accent = useRef(readAccent())

  useFrame(() => {
    const next = readAccent()
    if (!material.current || next === accent.current) return
    accent.current = next
    material.current.color.set(next)
  })

  return (
    <group>
      <mesh>
        <icosahedronGeometry args={[0.92, 0]} />
        <meshStandardMaterial ref={material} color={accent.current} roughness={1} metalness={0} />
      </mesh>
      <mesh scale={1.04}>
        <icosahedronGeometry args={[0.92, 0]} />
        <meshBasicMaterial color="#f4efe4" wireframe transparent opacity={0.18} />
      </mesh>
    </group>
  )
}

function GltfModel({ url }: { url: string }) {
  const [object, setObject] = useState<Group | null>(null)

  useEffect(() => {
    let cancelled = false
    const loader = new GLTFLoader()
    loader.load(
      url,
      (gltf) => {
        if (cancelled) return
        const root = cloneSkeleton(gltf.scene) as Group
        root.traverse((obj) => {
          obj.frustumCulled = false
        })
        flattenShading(root)
        fitModel(root)
        setObject(root)
      },
      undefined,
      () => {
        if (!cancelled) setObject(null)
      },
    )
    return () => {
      cancelled = true
    }
  }, [url])

  if (!object) return <AccentSculpture />
  return <primitive object={object} />
}

function Orbit({
  autoRotate,
  enabled,
  domElement,
}: {
  autoRotate: boolean
  enabled: boolean
  domElement: RefObject<HTMLElement | null>
}) {
  const { camera } = useThree()
  const controlsRef = useRef<OrbitControls | null>(null)

  useEffect(() => {
    const element = domElement.current
    if (!element) return

    const controls = new OrbitControls(camera, element)
    controls.enablePan = false
    controls.enableZoom = false
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.autoRotateSpeed = 1.15
    controls.minPolarAngle = 0.55
    controls.maxPolarAngle = 2.2
    controlsRef.current = controls

    return () => {
      controls.dispose()
      controlsRef.current = null
    }
  }, [camera, domElement])

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return
    controls.autoRotate = autoRotate
    controls.enabled = enabled
  }, [autoRotate, enabled])

  useFrame(() => {
    controlsRef.current?.update()
  })

  return null
}

function ModelViewport({
  active,
  autoRotate,
  orbitEl,
}: {
  active: boolean
  autoRotate: boolean
  orbitEl: RefObject<HTMLElement | null>
}) {
  return (
    <Canvas
      className="model-canvas"
      dpr={active ? [1, 1.5] : 1}
      resize={{ scroll: false, debounce: 0, offsetSize: true }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'low-power',
        stencil: false,
      }}
      camera={{ position: [0, 0.15, 2.75], fov: 32 }}
      style={{ pointerEvents: 'none' }}
      // onCreated={({ gl }) => {
      //   gl.setClearColor(0x000000, 0)
      // }}
    >
      <ambientLight intensity={1.8} />
      <GltfModel url={TEST_MODEL_URL} />
      <Orbit autoRotate={autoRotate} enabled={active} domElement={orbitEl} />
    </Canvas>
  )
}

export function ModelCard() {
  const active = useCarouselActive()
  const stageRef = useRef<HTMLDivElement>(null)
  const [userPaused, setUserPaused] = useState(false)
  const autoRotate = !prefersReducedMotion() && (active ? !userPaused : true)

  useEffect(() => {
    if (!active) setUserPaused(false)
  }, [active])

  return (
    <article className="card model-card">
      <h3>Model</h3>
      <div
        ref={stageRef}
        className="model-stage"
        onPointerDown={() => {
          if (active) setUserPaused(true)
        }}
      >
        <ModelViewport active={active} autoRotate={autoRotate} orbitEl={stageRef} />
      </div>
    </article>
  )
}
