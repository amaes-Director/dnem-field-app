/* DNEM ADA Lens - site walk order.
 * A visit is walked in this order: the three fixed stops, then the rooms the consultant adds.
 * Each stop or room type lists the elements usually checked there (the consultant can add any other).
 */
(function (root) {
  var WALK = {
    stops: [
      { id: 'parking', label: 'Parking', elements: ['parking_lot', 'parking', 'route', 'ramp', 'protruding'] },
      { id: 'route', label: 'Route to the entrance', elements: ['route', 'ramp', 'stairs', 'protruding'] },
      { id: 'entrance', label: 'Entrance', elements: ['door', 'route', 'operable', 'signage'] }
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
      { id: 'other', label: 'Other room or area', elements: ['door', 'signage', 'operable'] }
    ]
  };

  WALK.roomType = function (id) {
    for (var i = 0; i < WALK.roomTypes.length; i++) if (WALK.roomTypes[i].id === id) return WALK.roomTypes[i];
    return WALK.roomTypes[WALK.roomTypes.length - 1];
  };
  // "Meeting / conference room 2 - Board of Directors room"
  WALK.roomLabel = function (room) {
    var t = WALK.roomType(room.type).label;
    var s = t + (room.number ? ' ' + room.number : '');
    return room.name ? s + ' - ' + room.name : s;
  };
  // Ordered list of areas for a visit: [{ id, label, elements, kind: 'stop'|'room', room? }]
  WALK.areas = function (visit) {
    var out = WALK.stops.map(function (s) { return { id: s.id, label: s.label, elements: s.elements, kind: 'stop' }; });
    (visit.rooms || []).forEach(function (r) {
      out.push({ id: r.id, label: WALK.roomLabel(r), elements: WALK.roomType(r.type).elements, kind: 'room', room: r });
    });
    return out;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = WALK;
  else root.DNEM_WALK = WALK;
})(this);
