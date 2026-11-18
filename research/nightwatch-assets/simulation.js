/* World positions are fractions of the playfield. Angles are radians in screen
   space (positive clockwise); rock radii are fractions of its shorter side. */
(function (root) {
  'use strict';
  const TAU = 2 * Math.PI;
  const DURATION = 240;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const angleDelta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  const smooth = x => { const t = clamp(x); return t * t * (3 - 2 * t); };
  const reefs = [
    ['The Sisters', .503, .634, .024],
    ["Widow’s Teeth", .671, .445, .031],
    ['Black Maggie', .345, .565, .026],
    ['The Needle', .803, .704, .020],
    ['Bell Rock', .222, .429, .024],
    ['Dead Man’s Chair', .606, .842, .031],
    ['The Gripes', .424, .327, .021]
  ];
  const fleet = [
    ['schooner', 'Mary Elspeth'], ['trawler', 'Silver Darling'],
    ['steamer', 'North Star'], ['schooner', 'Agnes May'],
    ['trawler', 'Little Wren'], ['steamer', 'Dunlin'],
    ['trawler', 'Sea Holly'], ['schooner', 'Mercy Anne'],
    ['steamer', 'Maid of Barra'], ['trawler', 'Grey Petrel'],
    ['schooner', 'Rosabel'], ['steamer', 'St. Jude'],
    ['trawler', 'Redwing'], ['schooner', 'Ellen Rose'],
    ['steamer', 'Caledonia'], ['trawler', 'Green Linnet'],
    ['schooner', 'Islay Belle'], ['steamer', 'Western Isles']
  ];
  const passages = [
    [1.014,.325], [1.014,.245], [1.014,.747], [-.014,.30],
    [1.014,.855], [1.014,.50], [1.014,.423], [-.014,.24]
  ];

  // Convex outline of the seascape engraving in its plate coordinates. This includes
  // the lantern spire and the outlying boulders, so hulls cannot cross their image.
  const stationOutline = [
    [-155,140],[-4,-25],[3,-25],[155,145],[155,150],[134,164],
    [116,170],[79,181],[-25,186],[-39,186],[-133,169],[-155,148]
  ];
  function stationBoundary(width, height, portrait, lighthouse, padding) {
    const scale = Math.min(height*(portrait ? .00139 : .00146), width*(portrait ? .00215 : .00149), 1.65);
    const edges = stationOutline.map(([x,y], i) => {
      const [nextX,nextY] = stationOutline[(i+1)%stationOutline.length];
      const length = Math.hypot(nextX-x, nextY-y);
      const nx = (nextY-y)/length, ny = -(nextX-x)/length;
      return {nx, ny, c: nx*(lighthouse.x*width + x*scale) + ny*(lighthouse.y*height + y*scale) + padding};
    });
    // Retain a clear arrival lane on narrow layouts where the harbour and the
    // detached skerries appear close together in the projected view.
    const portGap = Math.max(...edges.map(e => .074*width*e.nx + .827*height*e.ny - e.c));
    if (portGap < 2) {
      for (const edge of edges) edge.c -= Math.min(padding, 2 - portGap);
    }
    const vertices = edges.map((edge, i) => {
      const prev = edges[(i+edges.length-1)%edges.length];
      const det = edge.nx*prev.ny - prev.nx*edge.ny;
      return {x:(edge.c*prev.ny-prev.c*edge.ny)/det, y:(edge.nx*prev.c-prev.nx*edge.c)/det};
    });
    return {edges, vertices};
  }

  function crossesStation(a, b, edges) {
    // Clip a segment to the open interior. Travelling along the boundary is safe.
    let enter = 0, exit = 1;
    for (const {nx,ny,c} of edges) {
      const offset = c - .01 - a.x*nx - a.y*ny;
      const direction = (b.x-a.x)*nx + (b.y-a.y)*ny;
      if (Math.abs(direction) < 1e-9) {
        if (offset <= 0) return false;
      } else if (direction > 0) exit = Math.min(exit, offset/direction);
      else enter = Math.max(enter, offset/direction);
      if (enter >= exit) return false;
    }
    return true;
  }

  // Fractional projection on a segment, used both for shadow depth and navigation.
  function segmentDistance(point, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy || 1));
    return Math.hypot(point.x - a.x - dx * t, point.y - a.y - dy * t);
  }

  class WatchSimulation {
    constructor({width = 1000, height = 720, portrait, reducedMotion = false,
      onEvent = () => {}, seed = Math.floor(Math.random() * 0xffffffff)} = {}) {
      this.reducedMotion = reducedMotion;
      this.onEvent = onEvent;
      this.seed = seed >>> 0;
      this.harbour = {x:.074, y:.827};
      this.beamHalfAngle = Math.PI / 20;
      this.resize(width, height, portrait);
      this.reset();
    }
    resize(width, height, portrait = width < height) {
      this.width = Math.max(1, width);
      this.height = Math.max(1, height);
      this.unit = Math.min(this.width, this.height);
      this.portrait = portrait;
      this.lighthouse = {x:portrait ? .47 : .31, y:portrait ? .735 : .705};
      const padding = 40 * clamp(this.unit/580,.72,1.35) + 2;
      this.station = stationBoundary(this.width,this.height,portrait,this.lighthouse,padding);
      for (const ship of this.ships || []) {
        ship.routeVersion = -1;
        if (ship.state !== 'sailing') continue;
        // Resizing changes the projected footprint of the engraving. Move an enclosed
        // vessel to the nearest side of its new safe-water boundary before rerouting.
        const p = {x:ship.x*this.width, y:ship.y*this.height};
        if (!crossesStation(p,p,this.station.edges)) continue;
        const nearest = this.station.edges.reduce((best,edge) => {
          const distance = edge.c-edge.nx*p.x-edge.ny*p.y;
          return distance < best.distance ? {edge,distance} : best;
        }, {distance:Infinity});
        ship.x += nearest.edge.nx * (nearest.distance+.1)/this.width;
        ship.y += nearest.edge.ny * (nearest.distance+.1)/this.height;
      }
    }
    reset() {
      this.mode = 'title';
      this.time = this.ambientTime = this.home = this.lost = this.storm = this.dawn = 0;
      this.endReason = null;
      this.entries = [];
      this.effects = [];
      this.fog = [];
      this.rocks = reefs.map(([name,x,y,radius], i) => ({
        id:i, name, x, y, radius, seed:173 + 83 * i, progress:0, memory:0, memoryLeft:0,
        glint:0, glintPhase: i * .243, wrecks:0
      }));
      this.serial = 0;
      this.ships = [this.newShip(.73, .53)];
      this.nextShipAt = 14;
      this.nextStrikeAt = 142;
      this.phase = 0;
      this.keys = 0;
      this.lastAimAt = -Infinity;
      this.angularVelocity = 0;
      this.beamAngle = this.targetAngle = this.bearing(this.lighthouse, {x:.53, y:.27});
    }
    get clock() {
      const minutes = (21 * 60 + Math.floor(this.time * 2 + 1e-6)) % 1440;
      return String(Math.floor(minutes / 60)).padStart(2, '0') + ':' +
        String(minutes % 60).padStart(2, '0');
    }
    random() {
      this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
      return this.seed / 4294967296;
    }
    emit(type, fields = {}) {
      this.onEvent({type, ...fields});
    }
    log(text, type = 'note') {
      const entry = {time:this.clock, text, type};
      this.entries.push(entry);
      this.emit('log', {entry});
    }
    bearing(a, b) {
      return Math.atan2((b.y - a.y) * this.height, (b.x - a.x) * this.width);
    }
    distance(a, b) {
      return Math.hypot((a.x - b.x) * this.width, (a.y - b.y) * this.height);
    }
    newShip(x, y) {
      const id = this.serial++;
      const [type, name] = fleet[id % fleet.length];
      return {id, type, name, x, y, angle:this.bearing({x,y}, this.harbour),
        charted:new Set(), route:[], routeVersion:-1, state:'sailing', effectAge:0,
        speed:({schooner:.0142, trawler:.0164, steamer:.0185})[type]};
    }
    start() {
      if (this.mode !== 'title') return;
      this.mode = 'playing';
      this.keys = 0;
      this.emit('start');
      this.log('Lamp lit. The first sail is in sight.');
    }
    restart() {
      this.reset();
      this.start();
    }
    pause() {
      if (this.mode !== 'playing') return;
      this.mode = 'paused';
      this.keys = 0;
      this.emit('pause');
    }
    resume() {
      if (this.mode !== 'paused') return;
      this.mode = 'playing';
      this.emit('resume');
    }
    end(reason) {
      if (this.mode !== 'playing') return;
      this.mode = 'ended';
      this.endReason = reason;
      this.keys = 0;
      this.log(reason === 'dawn' ? 'Daybreak. I have put out the lamp.' :
        'Three bells for the missing. My watch is over.');
      this.emit('end', {reason});
    }
    aim(x, y) {
      if (!Number.isFinite(x) || !Number.isFinite(y) ||
          (this.mode !== 'playing' && this.mode !== 'title')) return;
      this.targetAngle = this.bearing(this.lighthouse, {x, y});
      this.lastAimAt = this.ambientTime;
    }
    turn(value) {
      this.keys = (this.mode === 'title' || this.mode === 'playing') ? Math.sign(value) : 0;
    }
    idleAngle() {
      const t = this.ambientTime % 25;
      const range = this.titleSweep;
      const measured = range && Number.isFinite(range.from) && Number.isFinite(range.to);
      const centre = measured ? (range.from + range.to)/2 : this.bearing(this.lighthouse, {x:.525, y:.27});
      if (t < 18) {
        if (measured) return centre + (range.to-range.from)/2 * Math.sin(t*Math.PI/4.5);
        const x = .525 + .275 * Math.sin(t * Math.PI / 4.5);
        return this.bearing(this.lighthouse, {x, y:.27});
      }
      const top = centre;
      const schooner = this.bearing(this.lighthouse, this.ships[0]);
      if (t < 20) return top + (schooner - top) * smooth((t - 18) / 2);
      if (t < 21.5) return schooner;
      if (t < 23) return schooner + (Math.PI / 2 - schooner) * smooth((t - 21.5) / 1.5);
      return Math.PI / 2 + (top - Math.PI / 2) * smooth((t - 23) / 2);
    }
    steer(dt) {
      if (this.keys) {
        this.targetAngle += this.keys * 1.48 * dt;
        this.lastAimAt = this.ambientTime;
      } else if (this.mode === 'title' && this.ambientTime - this.lastAimAt > 7) {
        this.targetAngle = this.idleAngle();
      }
      const delta = angleDelta(this.targetAngle, this.beamAngle);
      this.angularVelocity = clamp(this.angularVelocity + (25 * delta - 8.3 * this.angularVelocity) * dt, -2.05, 2.05);
      this.beamAngle = angleDelta(this.beamAngle + this.angularVelocity * dt, 0);
      this.targetAngle = angleDelta(this.targetAngle, 0);
    }
    // Optical depth through the portion of each elliptical bank between lamp and target.
    fogTransmission(x, y) {
      let through = 1;
      for (const bank of this.fog) {
        const ax = (this.lighthouse.x - bank.x) / bank.rx;
        const ay = (this.lighthouse.y - bank.y) / bank.ry;
        const dx = (x - this.lighthouse.x) / bank.rx;
        const dy = (y - this.lighthouse.y) / bank.ry;
        const a = dx * dx + dy * dy;
        if (a < 1e-8) continue;
        const b = ax * dx + ay * dy;
        const disc = b * b - a * (ax * ax + ay * ay - 1);
        if (disc <= 0) continue;
        const extent = Math.sqrt(disc);
        const enter = Math.max(0, (-b - extent) / a);
        const leave = Math.min(1, (-b + extent) / a);
        if (leave > enter) through *= Math.exp(-1.9 * (leave - enter) * Math.sqrt(a) * bank.opacity);
      }
      return Math.max(.075, through);
    }
    lightAt(x, y) {
      if (this.endReason === 'dawn') return 0;
      const angle = Math.atan2((y-this.lighthouse.y)*this.height, (x-this.lighthouse.x)*this.width);
      const offset = Math.abs(angleDelta(angle, this.beamAngle)) / this.beamHalfAngle;
      if (offset >= 1) return 0;
      return (1 - smooth((offset - .66) / .34)) * this.fogTransmission(x,y);
    }
    update(dt) {
      if (!Number.isFinite(dt) || dt <= 0 || this.mode === 'paused') return;
      // A small step keeps steering and collisions stable across display refresh rates.
      // Hosts can use larger deltas for deterministic replays and headless checks.
      while (dt > 1e-8) {
        const step = Math.min(dt, 1/30);
        this.step(step);
        dt -= step;
        if (this.mode === 'paused') break;
      }
    }
    step(dt) {
      this.ambientTime += dt;
      for (const effect of this.effects) effect.age += dt;
      this.effects = this.effects.filter(effect => effect.age < effect.life);
      for (const ship of this.ships) {
        if (ship.state !== 'sailing') ship.effectAge += dt;
      }
      this.ships = this.ships.filter(s => s.state === 'sailing' || s.effectAge < (s.state === 'wrecked' ? 4.7 : 1.5));
      if (this.mode === 'ended') return;
      this.steer(dt);
      if (this.mode === 'title') {
        const ship = this.ships[0];
        ship.x = .73 - .012 * Math.sin(this.ambientTime * .08);
        ship.y = .53 + .005 * Math.sin(this.ambientTime * .09);
        this.updateRocks(dt, false);
        return;
      }
      this.time = Math.min(DURATION, this.time + dt);
      this.weather(dt);
      if (this.time >= DURATION - 1e-6) {
        this.time = DURATION;
        this.dawn = 1;
        this.end('dawn');
        return;
      }
      if (this.time >= this.nextShipAt) {
        const [x, y] = passages[(this.serial - 1) % passages.length];
        const ship = this.newShip(x, y);
        this.ships.push(ship);
        this.nextShipAt = this.time + 20.5 - 9.8 * this.time / DURATION + this.random() * 3;
      }
      this.updateRocks(dt, true);
      for (const ship of this.ships) {
        if (ship.state === 'sailing') this.sail(ship, dt);
        if (this.mode === 'ended') break;
      }
    }
    weather() {
      const t = this.time;
      const notes = [
        [58, 'A low bank of fog is drifting across the reef.'],
        [127, 'Wind rising. Rain against the glass.'],
        [205, 'The squall is passing. First grey in the east.']
      ];
      if (this.phase < notes.length && t >= notes[this.phase][0]) {
        this.log(notes[this.phase++][1], 'weather');
      }
      this.storm = smooth((t - 120) / 34) * (1 - smooth((t - 202) / 27));
      this.dawn = smooth((t - 208) / 32);
      this.fog = [];
      const a = smooth((t - 54) / 16) * (1 - this.dawn);
      if (a > .005) {
        this.fog.push({x:.85 - .32 * Math.sin((t - 54) / 58), y:.44 + .10 * Math.sin(t / 44),
          rx:.13, ry:.065, opacity:.76 * a});
        const b = smooth((t - 102) / 22);
        if (b > .005) this.fog.push({x:.14 + .24 * (1 + Math.sin(t / 39)), y:.66 + .08 * Math.sin(t / 29),
          rx:.105, ry:.049, opacity:.68 * a * b});
      }
      if (t >= this.nextStrikeAt && t < 209) {
        this.nextStrikeAt = t + 12 + this.random() * 15;
        if (!this.reducedMotion) this.effect('lightning', .2 + this.random() * .7, .1, .32);
        this.emit('thunder');
      }
    }
    updateRocks(dt, playing) {
      for (const rock of this.rocks) {
        const light = this.lightAt(rock.x, rock.y);
        if (playing && light > .055) {
          rock.progress = clamp(rock.progress + dt * light / .4);
          if (rock.progress >= 1) rock.memoryLeft = 8.5 - this.storm * 4.4;
        } else {
          rock.progress = Math.max(0, rock.progress - dt * 2.2);
        }
        rock.memoryLeft = Math.max(0, rock.memoryLeft - dt);
        rock.memory = clamp(rock.memoryLeft / (8.5 - this.storm * 4.4));
        let urgent = 0;
        for (const ship of this.ships) {
          if (ship.state !== 'sailing' || ship.charted.has(rock.id)) continue;
          const distance = this.distance(ship, rock) / this.unit;
          if (distance < .46 && Math.abs(angleDelta(this.bearing(ship, rock), ship.angle)) < .5) {
            urgent = Math.max(urgent, 1 - distance / .46);
          }
        }
        rock.glintPhase = (rock.glintPhase + dt * (.14 + 1.18 * urgent)) % 1;
        rock.glint = Math.pow(Math.max(0, 1 - rock.glintPhase / .16), 1.5) * (.39 + .61 * urgent);
      }
    }
    effect(type, x, y, life) {
      this.effects.push({type, x, y, age:0, life});
    }
    sail(ship, dt) {
      for (const rock of this.rocks) {
        if (rock.memory <= 0 || ship.charted.has(rock.id)) continue;
        if (this.distance(ship, rock) > this.unit * (.335 - .045 * this.storm)) continue;
        ship.charted.add(rock.id);
        this.effect('answer', ship.x, ship.y, 1.7);
        this.emit('answer', {ship, rock});
      }
      if (ship.routeVersion !== ship.charted.size) {
        ship.route = this.planRoute(ship);
        ship.routeVersion = ship.charted.size;
      }
      const goal = ship.route[0] || this.harbour;
      const remaining = this.distance(ship, goal);
      const speed = ship.speed * Math.hypot(this.width, this.height) * .78;
      const fraction = Math.min(1, dt * speed / (remaining || 1));
      const target = this.bearing(ship, goal);
      ship.angle = angleDelta(ship.angle + angleDelta(target, ship.angle) * (1 - Math.exp(-dt * 3.6)), 0);
      ship.x += (goal.x - ship.x) * fraction;
      ship.y += (goal.y - ship.y) * fraction;
      if (remaining <= speed * dt + .001) ship.route.shift();
      for (const rock of this.rocks) {
        if (ship.charted.has(rock.id)) continue;
        if (this.distance(ship, rock) <= (rock.radius + .007) * this.unit) {
          this.wreck(ship, rock);
          return;
        }
      }
      if (this.distance(ship, this.harbour) < .012 * this.unit) {
        ship.state = 'home';
        this.home++;
        this.effect('arrival', ship.x, ship.y, 1.6);
        this.log(this.shipTitle(ship) + ' brought in.', 'arrival');
        this.emit('arrival', {ship});
      }
    }
    shipTitle(ship) {
      return ship.type[0].toUpperCase() + ship.type.slice(1) + ' ' + ship.name;
    }
    wreck(ship, rock) {
      ship.state = 'wrecked';
      ship.effectAge = 0;
      rock.wrecks++;
      this.lost++;
      this.effect('flare', ship.x, ship.y, 4);
      this.log(this.shipTitle(ship) + ' lost on ' + rock.name + '.', 'wreck');
      this.emit('wreck', {ship, rock});
      if (this.lost >= 3) this.end('wrecks');
    }
    // Recompute only when a ship learns a hazard. A visibility graph around
    // known reefs lets her choose a continuous route through adjacent hazards.
    planRoute(ship) {
      const pixels = p => ({x:p.x * this.width, y:p.y * this.height});
      const start = pixels(ship), end = pixels(this.harbour);
      const known = this.rocks.filter(r => ship.charted.has(r.id)).map(r => ({
        ...pixels(r), radius:(r.radius + .014) * this.unit
      }));
      const clear = (a, b) => !crossesStation(a,b,this.station.edges) && known.every(rock => {
        // A late warning may arrive inside the buffer. Permit outward travel.
        const from = Math.hypot(a.x - rock.x, a.y - rock.y);
        if (from < rock.radius && (b.x - a.x) * (a.x - rock.x) + (b.y - a.y) * (a.y - rock.y) >= 0) return true;
        return segmentDistance(rock,a,b) >= rock.radius - .00001;
      });
      if (clear(start,end)) return [this.harbour];
      const points = [start,end, ...this.station.vertices.filter(p =>
        p.x > 0 && p.x < this.width && p.y > .22*this.height && p.y < this.height - 5
      )];
      for (const rock of known) {
        for (let i = 0; i < 12; i++) {
          const a = TAU * i / 12;
          points.push({x:rock.x + rock.radius * 1.05 * Math.cos(a), y:rock.y + rock.radius * 1.05 * Math.sin(a)});
        }
      }
      const costs = Array(points.length).fill(Infinity);
      const previous = Array(points.length).fill(-1);
      const visited = new Set();
      costs[0] = 0;
      while (true) {
        let best = -1, least = Infinity;
        for (let i = 0; i < costs.length; i++) {
          if (!visited.has(i) && costs[i] < least) {best = i; least = costs[i];}
        }
        if (best === -1 || best === 1) break;
        visited.add(best);
        for (let i = 1; i < points.length; i++) {
          if (visited.has(i)) continue;
          const a = points[best], b = points[i];
          const next = least + Math.hypot(b.x-a.x, b.y-a.y);
          if (next < costs[i] && clear(a,b)) {costs[i] = next; previous[i] = best;}
        }
      }
      if (previous[1] === -1) return [this.harbour];
      const route = [];
      for (let at = 1; at > 0; at = previous[at]) {
        route.unshift({x:points[at].x / this.width, y:points[at].y / this.height});
      }
      return route;
    }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = WatchSimulation;
  root.WatchSimulation = WatchSimulation;
})(typeof window !== 'undefined' ? window : globalThis);
