// SI units; one horizontal dimension, inertial frame, constant mass. No eval.
export const G = 10;
export function journey({ outward = 6, back = 4, firstTime = 3, secondTime = 2, time = 0 } = {}) {
  const duration = firstTime + secondTime;
  const t = Math.max(0, Math.min(duration, time));
  const returning = t >= firstTime;
  const x = returning ? outward - back * (t - firstTime) / secondTime : outward * t / firstTime;
  return { time: t, duration, outward, back, firstTime, secondTime, x,
    travelled: returning ? outward + back * (t - firstTime) / secondTime : x,
    distance: outward + back, displacement: outward - back,
    averageSpeed: (outward + back) / duration, averageVelocity: (outward - back) / duration,
    velocity: returning ? -back / secondTime : outward / firstTime,
    points: [[0, 0], [firstTime, outward], [duration, outward - back]] };
}
export function motion({ initialVelocity = -4, acceleration = 2, time = 0 } = {}) {
  const x = initialVelocity * time + .5 * acceleration * time * time;
  const velocity = initialVelocity + acceleration * time;
  const turnTime = acceleration && -initialVelocity / acceleration;
  return { x, velocity, acceleration, time, initialVelocity, turnTime: turnTime > 0 ? turnTime : null,
    behaviour: velocity === 0 ? 'Bu anda duruyor' : velocity * acceleration < 0 ? 'Yavaşlıyor' : velocity * acceleration > 0 ? 'Süratleniyor' : 'Sabit hızlı' };
}
export function dynamics({ mass = 2, right = 6, left = 2, initialVelocity = 0, time = 0 } = {}) {
  if (mass <= 0) throw new RangeError('Mass must be positive');
  const net = right - left;
  return { ...motion({ initialVelocity, acceleration: net / mass, time }), mass, right, left, net, normal: mass * G, weight: mass * G };
}
export function friction({ mass = 2, applied = 5, muStatic = .4, muKinetic = .3, initialVelocity = 0, time = 0 } = {}) {
  if (mass <= 0 || applied < 0 || initialVelocity < 0 || muKinetic < 0 || muStatic < muKinetic) throw new RangeError('Outside horizontal rightward sliding model');
  const normal = mass * G, limit = muStatic * normal, kinetic = muKinetic * normal;
  // At the static threshold an initially resting block can remain in equilibrium.
  if (initialVelocity === 0 && applied <= limit) return { x: 0, velocity: 0, acceleration: 0, net: 0, friction: applied, normal, limit, kinetic, regime: 'static' };
  const acceleration = (applied - kinetic) / mass;
  const stopTime = acceleration < 0 ? -initialVelocity / acceleration : Infinity;
  if (time >= stopTime) return { x: initialVelocity * stopTime + .5 * acceleration * stopTime ** 2,
    velocity: 0, acceleration: 0, net: 0, friction: applied, normal, limit, kinetic, regime: 'stopped' };
  return { ...motion({ initialVelocity, acceleration, time }), net: applied - kinetic, friction: kinetic, normal, limit, kinetic, regime: 'kinetic' };
}
export function reaction({ force = 80, massA = 40, massB = 80, time = 0 } = {}) {
  if (massA <= 0 || massB <= 0) throw new RangeError('Mass must be positive');
  return { forceA: -force, forceB: force, accelerationA: -force / massA, accelerationB: force / massB,
    xA: -.5 * force / massA * time ** 2, xB: .5 * force / massB * time ** 2 };
}
export const physicsFormat = value => new Intl.NumberFormat('tr', { maximumFractionDigits: 2 }).format(Object.is(value, -0) ? 0 : value);
