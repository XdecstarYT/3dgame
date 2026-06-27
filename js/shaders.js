'use strict';

// Custom voxel shader: baked sky-light + block-light + ambient occlusion in vertex
// attributes, combined with a day/night uniform so we never rebuild meshes for time.
const Shaders = (() => {
  const shared = {
    uDay:     { value: 1.0 },
    fogColor: { value: new THREE.Color(0x87ceeb) },
    fogNear:  { value: 40 },
    fogFar:   { value: 240 },
  };

  const VERT = `
    attribute vec3 aLight;        // x=skyLight(0..1), y=blockLight(0..1), z=ao*faceShade
    varying vec2 vUv;
    varying float vBright;
    varying float vFog;
    uniform float uDay;
    uniform float fogNear;
    uniform float fogFar;
    void main() {
      vUv = uv;
      float sky = aLight.x * uDay;
      float light = max(sky, aLight.y);
      light = max(light, 0.05);            // tiny minimum so nothing is pure black
      vBright = light * aLight.z;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vFog = smoothstep(fogNear, fogFar, -mv.z);
      gl_Position = projectionMatrix * mv;
    }
  `;

  const FRAG = `
    precision mediump float;
    uniform sampler2D map;
    uniform vec3 fogColor;
    uniform float uOpacity;
    uniform float uCutout;
    varying vec2 vUv;
    varying float vBright;
    varying float vFog;
    void main() {
      vec4 tex = texture2D(map, vUv);
      if (uCutout > 0.5 && tex.a < 0.5) discard;
      vec3 col = tex.rgb * vBright;
      col = mix(col, fogColor, vFog);
      gl_FragColor = vec4(col, tex.a * uOpacity);
    }
  `;

  function makeTerrain(tex) {
    return new THREE.ShaderMaterial({
      uniforms: Object.assign({
        map:      { value: tex },
        uOpacity: { value: 1.0 },
        uCutout:  { value: 1.0 },
      }, shared),
      vertexShader: VERT,
      fragmentShader: FRAG,
      side: THREE.DoubleSide,
    });
  }

  function makeWater(tex) {
    return new THREE.ShaderMaterial({
      uniforms: Object.assign({
        map:      { value: tex },
        uOpacity: { value: 0.72 },
        uCutout:  { value: 0.0 },
      }, shared),
      vertexShader: VERT,
      fragmentShader: FRAG,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
    });
  }

  function update(day, fogColor, near, far) {
    shared.uDay.value = day;
    if (fogColor) shared.fogColor.value.copy(fogColor);
    if (near !== undefined) shared.fogNear.value = near;
    if (far !== undefined) shared.fogFar.value = far;
  }

  return { makeTerrain, makeWater, update, shared };
})();
