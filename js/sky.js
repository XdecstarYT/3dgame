'use strict';

class Sky {
  constructor(scene) {
    this.scene = scene;
    this.sunLight = null;
    this.ambientLight = null;
    this.skyMesh = null;
    this.sunMesh = null;
    this.moonMesh = null;
    this.starsMesh = null;
    this.fogColor = new THREE.Color();

    this._build(scene);
  }

  _build(scene) {
    // Sky sphere (inverted)
    const skyGeo = new THREE.SphereGeometry(800, 16, 16);
    skyGeo.scale(-1, 1, 1); // invert
    const skyMat = new THREE.MeshBasicMaterial({ vertexColors: true });
    // We'll update vertex colors every frame
    this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
    scene.add(this.skyMesh);

    // Sun
    const sunGeo = new THREE.SphereGeometry(30, 8, 8);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffffaa });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    scene.add(this.sunMesh);

    // Moon
    const moonGeo = new THREE.SphereGeometry(15, 8, 8);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xddddff });
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
    scene.add(this.moonMesh);

    // Stars (points)
    const starsGeo = new THREE.BufferGeometry();
    const starVerts = [];
    for (let i = 0; i < 1000; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 750;
      starVerts.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );
    }
    starsGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVerts, 3));
    const starsMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false });
    this.starsMesh = new THREE.Points(starsGeo, starsMat);
    scene.add(this.starsMesh);

    // Lighting
    this.ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.sunLight.position.set(100, 200, 100);
    scene.add(this.sunLight);
  }

  update(timeOfDay, playerPos) {
    // timeOfDay: 0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset, 1 = midnight
    const angle = timeOfDay * Math.PI * 2;
    const sunX = Math.cos(angle) * 700;
    const sunY = Math.sin(angle) * 700;

    // Sun and moon positions (opposite each other)
    this.sunMesh.position.set(playerPos.x + sunX, playerPos.y + sunY, playerPos.z);
    this.moonMesh.position.set(playerPos.x - sunX, playerPos.y - sunY, playerPos.z);
    this.skyMesh.position.set(playerPos.x, playerPos.y, playerPos.z);
    this.starsMesh.position.set(playerPos.x, playerPos.y, playerPos.z);

    // Day/night colors
    const isDay = sunY > 0;
    const t = Math.max(0, sunY / 700); // 0 at horizon, 1 at noon

    // Sky color interpolation
    let skyTop, skyHorizon;
    if (isDay) {
      skyTop = new THREE.Color().lerpColors(
        new THREE.Color(0.5, 0.6, 0.9), // sunrise/sunset top
        new THREE.Color(0.3, 0.55, 0.9), // noon top
        t
      );
      skyHorizon = new THREE.Color().lerpColors(
        new THREE.Color(0.9, 0.5, 0.2), // sunrise/sunset horizon
        new THREE.Color(0.5, 0.75, 1.0), // noon horizon
        t
      );
    } else {
      skyTop = new THREE.Color(0.02, 0.02, 0.08);
      skyHorizon = new THREE.Color(0.05, 0.05, 0.12);
    }

    // Update sky vertex colors
    const posAttr = this.skyMesh.geometry.getAttribute('position');
    const count = posAttr.count;
    let colorAttr = this.skyMesh.geometry.getAttribute('color');
    if (!colorAttr) {
      colorAttr = new THREE.Float32BufferAttribute(count * 3, 3);
      this.skyMesh.geometry.setAttribute('color', colorAttr);
    }
    for (let i = 0; i < count; i++) {
      const y = posAttr.getY(i);
      const blend = Math.max(0, Math.min(1, (y + 400) / 800));
      const col = new THREE.Color().lerpColors(skyHorizon, skyTop, blend);
      colorAttr.setXYZ(i, col.r, col.g, col.b);
    }
    colorAttr.needsUpdate = true;

    // Fog color matches horizon
    this.fogColor.copy(skyHorizon);

    // Lighting
    const lightIntensity = isDay ? t * 0.9 + 0.1 : 0.05;
    this.sunLight.intensity = lightIntensity;
    this.sunLight.position.set(sunX, sunY, 0);

    const ambientIntensity = isDay ? 0.3 + t * 0.4 : 0.05;
    this.ambientLight.intensity = ambientIntensity;
    this.ambientLight.color.lerpColors(
      new THREE.Color(0.2, 0.2, 0.4), // night
      new THREE.Color(1.0, 0.98, 0.9), // day
      isDay ? t : 0
    );

    // Stars visibility
    this.starsMesh.material.opacity = isDay ? Math.max(0, 1 - t * 3) : 1;
    this.starsMesh.material.transparent = true;

    // Sun/moon visibility
    this.sunMesh.visible = sunY > -50;
    this.moonMesh.visible = sunY < 50;

    // Sun color
    if (isDay) {
      this.sunMesh.material.color.lerpColors(
        new THREE.Color(1.0, 0.6, 0.2), // orange at horizon
        new THREE.Color(1.0, 1.0, 0.8), // white at noon
        t
      );
    }

    return this.fogColor;
  }

  dispose() {
    this.scene.remove(this.skyMesh);
    this.scene.remove(this.sunMesh);
    this.scene.remove(this.moonMesh);
    this.scene.remove(this.starsMesh);
    this.scene.remove(this.ambientLight);
    this.scene.remove(this.sunLight);
  }
}
