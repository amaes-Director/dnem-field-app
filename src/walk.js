/* DNEM ADA Lens - site walk order.
 * A visit is walked in this order: the three fixed stops, then the rooms the consultant adds,
 * then outdoor and recreation areas (playgrounds, pools, parks...). Outdoor areas are stored in
 * visit.rooms with kind: 'outdoor'; rooms without a kind are indoor rooms.
 * Each stop or room type lists the elements usually checked there (the consultant can add any other).
 */
(function (root) {
  var WALK = {
    stops: [
      { id: 'parking', label: 'Parking', elements: ['parking_lot', 'parking', 'loading_zone', 'curb_ramp', 'route', 'ramp', 'protruding'] },
      { id: 'route', label: 'Route to the entrance', elements: ['route', 'curb_ramp', 'ramp', 'stairs', 'protruding'] },
      { id: 'entrance', label: 'Entrance', elements: ['door', 'route', 'entrance_signs', 'operable', 'signage'] }
    ],
    roomTypes: [
      { id: 'restroom', label: 'Restroom', elements: ['door', 'signage', 'toilet_room', 'toilet', 'lavatory', 'urinal', 'operable'] },
      { id: 'lobby', label: 'Lobby / reception', elements: ['door', 'counter', 'operable', 'protruding', 'fountain'] },
      { id: 'meeting', label: 'Meeting / conference room', elements: ['door', 'signage', 'work_surface', 'operable', 'protruding'] },
      { id: 'office', label: 'Office', elements: ['door', 'signage', 'work_surface', 'operable'] },
      { id: 'hallway', label: 'Hallway / corridor', elements: ['route', 'protruding', 'door', 'signage', 'fountain'] },
      { id: 'kitchen', label: 'Break room / kitchen', elements: ['door', 'work_surface', 'lavatory', 'operable'] },
      { id: 'elevator', label: 'Elevator', elements: ['operable', 'signage'] },
      { id: 'stairway', label: 'Stairway', elements: ['stairs', 'door', 'signage'] },
      { id: 'fitness', label: 'Fitness room / gym', elements: ['door', 'exercise', 'route', 'operable', 'signage'] },
      { id: 'other', label: 'Other room or area', elements: ['door', 'signage', 'operable'] }
    ],
    outdoorTypes: [
      { id: 'playground', label: 'Playground', elements: ['play_area', 'play_ramp', 'play_transfer', 'play_component', 'route'] },
      { id: 'pool', label: 'Pool or spa', elements: ['pool', 'pool_lift', 'pool_slope', 'transfer_wall', 'route', 'door'] },
      { id: 'park', label: 'Park, picnic area or courtyard', elements: ['route', 'picnic', 'fountain', 'protruding', 'stairs', 'ramp'] },
      { id: 'sports', label: 'Sports field, court or bleachers', elements: ['assembly', 'route', 'ramp'] },
      { id: 'water', label: 'Fishing pier or boat dock', elements: ['fishing', 'boating', 'route', 'ramp'] },
      { id: 'golf', label: 'Golf or mini golf', elements: ['golf', 'route'] },
      { id: 'fitness', label: 'Outdoor fitness area', elements: ['exercise', 'route'] },
      { id: 'transit', label: 'Bus stop or drop-off', elements: ['bus_stop', 'loading_zone', 'curb_ramp', 'route'] },
      { id: 'other', label: 'Other outdoor area', elements: ['route', 'ramp', 'stairs', 'operable'] }
    ]
  };

  function isOutdoor(room) { return room && room.kind === 'outdoor'; }
  WALK.isOutdoor = isOutdoor;
  WALK.typesFor = function (kind) { return kind === 'outdoor' ? WALK.outdoorTypes : WALK.roomTypes; };
  // roomType(room) or roomType(typeId, kind)
  WALK.roomType = function (id, kind) {
    if (id && typeof id === 'object') { kind = id.kind; id = id.type; }
    var list = WALK.typesFor(kind);
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return list[list.length - 1];
  };
  // "Meeting / conference room 2 - Board of Directors room"
  WALK.roomLabel = function (room) {
    var t = WALK.roomType(room).label;
    var s = t + (room.number ? ' ' + room.number : '');
    return room.name ? s + ' - ' + room.name : s;
  };
  // Ordered list of areas for a visit: [{ id, label, elements, kind: 'stop'|'room'|'outdoor', room? }]
  WALK.areas = function (visit) {
    var out = WALK.stops.map(function (s) { return { id: s.id, label: s.label, elements: s.elements, kind: 'stop' }; });
    var rooms = visit.rooms || [];
    rooms.filter(function (r) { return !isOutdoor(r); }).concat(rooms.filter(isOutdoor)).forEach(function (r) {
      out.push({ id: r.id, label: WALK.roomLabel(r), elements: WALK.roomType(r).elements, kind: isOutdoor(r) ? 'outdoor' : 'room', room: r });
    });
    return out;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = WALK;
  else root.DNEM_WALK = WALK;
})(this);
