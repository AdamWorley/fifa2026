import { useCallback, useEffect, useRef } from 'react'

// Safari exposes requestPermission on the constructor; Chrome/Android doesn't.
type MotionCtor = { requestPermission?: () => Promise<'granted' | 'denied' | 'default'> }

function motionCtor(): MotionCtor | undefined {
  return typeof DeviceMotionEvent !== 'undefined'
    ? (DeviceMotionEvent as unknown as MotionCtor)
    : undefined
}

/**
 * Fire `onShake` when the device is given a good shake. Returns a `primeMotion`
 * callback to invoke from a user gesture: on iOS that's required to request
 * motion permission, on Android/desktop it's a no-op (we attach on mount).
 *
 * `threshold` is the summed per-axis acceleration delta (m/s²) that counts as a
 * shake; a 1.5s cooldown stops one shake from firing the chaos repeatedly.
 */
export function useShakeToTrigger(onShake: () => void, threshold = 32): () => void {
  const last = useRef({ x: 0, y: 0, z: 0, t: 0 })
  const cooldown = useRef(0)
  const attached = useRef(false)
  const onShakeRef = useRef(onShake)

  useEffect(() => {
    onShakeRef.current = onShake
  }, [onShake])

  const handleMotion = useCallback(
    (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity
      if (!a) return
      const t = e.timeStamp
      const prev = last.current
      if (t - prev.t < 80) return // sample at ~12Hz, not every event
      const x = a.x ?? 0
      const y = a.y ?? 0
      const z = a.z ?? 0
      const delta = Math.abs(x - prev.x) + Math.abs(y - prev.y) + Math.abs(z - prev.z)
      last.current = { x, y, z, t }
      if (delta > threshold && t - cooldown.current > 1500) {
        cooldown.current = t
        onShakeRef.current()
      }
    },
    [threshold],
  )

  const attach = useCallback(() => {
    if (attached.current) return
    attached.current = true
    window.addEventListener('devicemotion', handleMotion)
  }, [handleMotion])

  const primeMotion = useCallback(() => {
    const DME = motionCtor()
    if (!DME) return
    if (typeof DME.requestPermission === 'function') {
      DME.requestPermission()
        .then((state) => {
          if (state === 'granted') attach()
        })
        .catch(() => {})
    } else {
      attach()
    }
  }, [attach])

  useEffect(() => {
    // Browsers without the permission gate (Android/desktop) can listen at once.
    const DME = motionCtor()
    if (DME && typeof DME.requestPermission !== 'function') attach()
    return () => {
      if (attached.current) {
        window.removeEventListener('devicemotion', handleMotion)
        attached.current = false
      }
    }
  }, [attach, handleMotion])

  return primeMotion
}
