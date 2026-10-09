/* DNEM Field Capture - rules table
 *
 * One entry per element type. "fields" are what the phone app asks for.
 * "checks" compare those fields against two codes:
 *   ada : 2010 ADA Standards for Accessible Design (DOJ). Section numbers are the 2010 Standards.
 *   mi  : Michigan barrier-free requirements = 2021 Michigan Building Code (effective April 9, 2025),
 *         Chapter 11, which adopts ICC A117.1-2017 (R 408.30427 excludes A117.1 sections 611 and 707).
 *
 * A check side can hold: min, max (numbers in the field's base unit), expect (true/false),
 * cite (section text), verify (true = value or section number not yet confirmed against the
 * printed code), newBuilding (true = requirement applies only to buildings built or altered
 * under the 2021 MBC / A117.1-2017 "new building" provisions).
 *
 * When both codes give a limit, the checker uses the stricter one (largest minimum, smallest
 * maximum) and cites whichever code sets it, or both when they match.
 *
 * Field types: len (inches; app also accepts cm), slope (percent; app also accepts degrees),
 * force (lbf), time (seconds), count, bool (yes/no), choice.
 */
(function (root) {
  var MI = 'ICC A117.1-2017';

  // Shorthand: side(cite, limits) builds one code side.
  function ada(sec, lim) { return Object.assign({ cite: 'ADA 2010 §' + sec }, lim || {}); }
  function mi(sec, lim, opts) {
    return Object.assign({ cite: MI + ' §' + sec, verify: true }, lim || {}, opts || {});
  }

  var RULES = {
    version: '2026-10-09.1',
    codes: {
      ada: { short: 'ADA 2010', name: '2010 ADA Standards for Accessible Design' },
      mi: {
        short: 'Michigan',
        name: '2021 Michigan Building Code, Chapter 11 (adopts ICC A117.1-2017), effective April 9, 2025',
        note: 'Michigan Administrative Code R 408.30427 adopts ICC A117.1 except sections 611 and 707.'
      }
    },
    buildingStatus: [
      { id: 'new', label: 'Built or altered under the 2021 Michigan Building Code (permit on or after April 9, 2025)' },
      { id: 'existing', label: 'Built or last altered before April 9, 2025' },
      { id: 'unknown', label: 'Not known' }
    ],
    elements: [
      // ---------------------------------------------------------------- Parking
      {
        id: 'parking_lot', label: 'Parking lot (space counts)', group: 'Site',
        fields: [
          { id: 'total', type: 'count', label: 'Total parking spaces in this lot' },
          { id: 'accessible', type: 'count', label: 'Accessible spaces (including van spaces)' },
          { id: 'van', type: 'count', label: 'Van-accessible spaces' },
          { id: 'medical', type: 'bool', label: 'Lot serves a hospital outpatient, rehabilitation or outpatient physical therapy facility?' }
        ],
        checks: [
          {
            id: 'lot-count', label: 'Number of accessible spaces', kind: 'parkingCount', fields: ['total', 'accessible'],
            ada: ada('208.2 (Table 208.2)'), mi: { cite: '2021 MBC §1106.1 (Table 1106.1)', verify: true },
            note: 'Hospital outpatient (10%) and rehabilitation/outpatient PT (20%) facilities have higher counts (ADA 208.2.1, 208.2.2).'
          },
          {
            id: 'lot-van', label: 'Number of van-accessible spaces (1 per 6 accessible, or fraction)', kind: 'vanCount', fields: ['accessible', 'van'],
            ada: ada('208.2.4'), mi: { cite: '2021 MBC §1106.5', verify: true }
          }
        ]
      },
      {
        id: 'parking', label: 'Accessible parking space', group: 'Site',
        fields: [
          { id: 'van', type: 'bool', label: 'Is this a van-accessible space?' },
          { id: 'space_width', type: 'len', label: 'Space width (centerline of stripes)' },
          { id: 'aisle_width', type: 'len', label: 'Access aisle width' },
          { id: 'slope', type: 'slope', label: 'Steepest slope in space or aisle (any direction)' },
          { id: 'aisle_marked', type: 'bool', label: 'Access aisle marked (hatched) to discourage parking?' },
          { id: 'aisle_route', type: 'bool', label: 'Access aisle connects to an accessible route?' },
          { id: 'sign_present', type: 'bool', label: 'Sign with International Symbol of Accessibility?' },
          { id: 'sign_height', type: 'len', label: 'Ground to bottom of sign' },
          { id: 'van_sign', type: 'bool', label: 'Sign says "van accessible"? (van spaces)' },
          { id: 'van_clearance', type: 'len', label: 'Vertical clearance (garages/covered spaces only)', allowNA: true }
        ],
        checks: [
          { id: 'pk-width', label: 'Car space width', field: 'space_width', when: { van: false },
            ada: ada('502.2', { min: 96 }), mi: mi('502.2', { min: 96 }) },
          { id: 'pk-aisle', label: 'Access aisle width (car space)', field: 'aisle_width', when: { van: false },
            ada: ada('502.3.1', { min: 60 }), mi: mi('502.4', { min: 60 }) },
          { id: 'pk-van', label: 'Van space and aisle: 132 in space with 60 in aisle, or 96 in space with 96 in aisle', kind: 'vanDims',
            fields: ['space_width', 'aisle_width'], when: { van: true },
            ada: ada('502.2 and Exception'), mi: mi('502.2, 502.3 and 502.4') },
          { id: 'pk-slope', label: 'Space and aisle slope (1:48 max)', field: 'slope',
            ada: ada('502.4', { max: 2.08 }), mi: mi('502.5', { max: 2.08 }) },
          { id: 'pk-marked', label: 'Access aisle marked', field: 'aisle_marked',
            ada: ada('502.3.3', { expect: true }), mi: mi('502.4.3', { expect: true }) },
          { id: 'pk-route', label: 'Access aisle adjoins accessible route', field: 'aisle_route',
            ada: ada('502.3', { expect: true }), mi: mi('502.4', { expect: true }) },
          { id: 'pk-sign', label: 'Accessible parking sign provided', field: 'sign_present',
            ada: ada('216.5 and 502.6', { expect: true }), mi: { cite: '2021 MBC §1112.1; ' + MI + ' §502.8', expect: true, verify: true } },
          { id: 'pk-sign-ht', label: 'Sign height to bottom of sign', field: 'sign_height',
            ada: ada('502.6', { min: 60 }), mi: mi('502.8', { min: 60 }) },
          { id: 'pk-van-sign', label: '"Van accessible" designation', field: 'van_sign', when: { van: true },
            ada: ada('502.6', { expect: true }), mi: mi('502.8', { expect: true }) },
          { id: 'pk-van-clr', label: 'Van vertical clearance', field: 'van_clearance', when: { van: true },
            ada: ada('502.5', { min: 98 }), mi: mi('502.7', { min: 98 }) }
        ]
      },
      // ---------------------------------------------------------------- Routes
      {
        id: 'route', label: 'Accessible route / walkway', group: 'Routes',
        fields: [
          { id: 'running_slope', type: 'slope', label: 'Running slope (direction of travel)' },
          { id: 'cross_slope', type: 'slope', label: 'Cross slope' },
          { id: 'clear_width', type: 'len', label: 'Clear width' },
          { id: 'level_change', type: 'len', label: 'Largest change in level (vertical)', allowNA: true },
          { id: 'beveled', type: 'bool', label: 'Is that change in level beveled (1:2 max)?' },
          { id: 'opening', type: 'len', label: 'Largest opening in grate or gap', allowNA: true },
          { id: 'surface', type: 'bool', label: 'Surface firm, stable and slip resistant?' }
        ],
        checks: [
          { id: 'rt-run', label: 'Running slope (1:20 max; steeper is a ramp)', field: 'running_slope',
            ada: ada('403.3', { max: 5 }), mi: mi('403.3', { max: 5 }) },
          { id: 'rt-cross', label: 'Cross slope (1:48 max)', field: 'cross_slope',
            ada: ada('403.3', { max: 2.08 }), mi: mi('403.3', { max: 2.08 }) },
          { id: 'rt-width', label: 'Clear width', field: 'clear_width',
            ada: ada('403.5.1', { min: 36 }), mi: mi('403.5.1', { min: 36 }),
            note: 'May narrow to 32 in for 24 in max length at intervals of 48 in min.' },
          { id: 'rt-level', label: 'Change in level (1/4 in vertical, or 1/2 in beveled)', kind: 'levelChange',
            fields: ['level_change', 'beveled'], ada: ada('303.2 and 303.3'), mi: mi('303.2 and 303.3') },
          { id: 'rt-open', label: 'Openings in floor or ground (1/2 in sphere)', field: 'opening',
            ada: ada('302.3', { max: 0.5 }), mi: mi('302.3', { max: 0.5 }) },
          { id: 'rt-surface', label: 'Surface firm, stable, slip resistant', field: 'surface',
            ada: ada('302.1', { expect: true }), mi: mi('302.1', { expect: true }) }
        ]
      },
      {
        id: 'ramp', label: 'Ramp', group: 'Routes',
        fields: [
          { id: 'running_slope', type: 'slope', label: 'Running slope (steepest reading)' },
          { id: 'cross_slope', type: 'slope', label: 'Cross slope' },
          { id: 'clear_width', type: 'len', label: 'Clear width between handrails' },
          { id: 'rise', type: 'len', label: 'Rise of this ramp run' },
          { id: 'landing_top', type: 'len', label: 'Top landing length' },
          { id: 'landing_bottom', type: 'len', label: 'Bottom landing length' },
          { id: 'landing_slope', type: 'slope', label: 'Steepest landing slope' },
          { id: 'handrails', type: 'bool', label: 'Handrails on both sides?' },
          { id: 'handrail_height', type: 'len', label: 'Handrail height (top of gripping surface)' },
          { id: 'handrail_ext', type: 'bool', label: 'Handrails extend 12 in level at top and bottom?' },
          { id: 'handrail_dia', type: 'len', label: 'Handrail outside diameter (circular)', allowNA: true },
          { id: 'edge', type: 'bool', label: 'Edge protection (curb, barrier or extended surface)?' }
        ],
        checks: [
          { id: 'rp-run', label: 'Running slope (1:12 max)', field: 'running_slope',
            ada: ada('405.2', { max: 8.33 }), mi: mi('405.2', { max: 8.33 }),
            note: 'Existing sites with space limits may use steeper slopes for short rises (ADA 405.2 Exception, Table 405.2).' },
          { id: 'rp-cross', label: 'Cross slope (1:48 max)', field: 'cross_slope',
            ada: ada('405.3', { max: 2.08 }), mi: mi('405.3', { max: 2.08 }) },
          { id: 'rp-width', label: 'Clear width', field: 'clear_width',
            ada: ada('405.5', { min: 36 }), mi: mi('405.5', { min: 36 }) },
          { id: 'rp-rise', label: 'Rise per run', field: 'rise',
            ada: ada('405.6', { max: 30 }), mi: mi('405.6', { max: 30 }) },
          { id: 'rp-land-top', label: 'Top landing length', field: 'landing_top',
            ada: ada('405.7.3', { min: 60 }), mi: mi('405.7.3', { min: 60 }) },
          { id: 'rp-land-bot', label: 'Bottom landing length', field: 'landing_bottom',
            ada: ada('405.7.3', { min: 60 }), mi: mi('405.7.3', { min: 60 }) },
          { id: 'rp-land-slope', label: 'Landing slope (1:48 max)', field: 'landing_slope',
            ada: ada('405.7.1', { max: 2.08 }), mi: mi('405.7.1', { max: 2.08 }) },
          { id: 'rp-rails', label: 'Handrails required (rise over 6 in)', field: 'handrails', when: { rise: { gt: 6 } },
            ada: ada('405.8', { expect: true }), mi: mi('405.8', { expect: true }) },
          { id: 'rp-rail-ht', label: 'Handrail height', field: 'handrail_height', when: { rise: { gt: 6 } },
            ada: ada('505.4', { min: 34, max: 38 }), mi: mi('505.4', { min: 34, max: 38 }) },
          { id: 'rp-rail-ext', label: 'Handrail extensions', field: 'handrail_ext', when: { rise: { gt: 6 } },
            ada: ada('505.10.1', { expect: true }), mi: mi('505.10.1', { expect: true }) },
          { id: 'rp-rail-dia', label: 'Handrail diameter (circular)', field: 'handrail_dia', when: { rise: { gt: 6 } },
            ada: ada('505.7.1', { min: 1.25, max: 2 }), mi: mi('505.7.1', { min: 1.25, max: 2 }) },
          { id: 'rp-edge', label: 'Edge protection', field: 'edge',
            ada: ada('405.9', { expect: true }), mi: mi('405.9', { expect: true }),
            note: 'Not required where the ramp rise is 6 in max, or where the side flares or the ramp adjoins a curb or wall (ADA 405.9 Exceptions).' }
        ]
      },
      {
        id: 'stairs', label: 'Stairs', group: 'Routes',
        fields: [
          { id: 'riser', type: 'len', label: 'Tallest riser height' },
          { id: 'riser_min', type: 'len', label: 'Shortest riser height' },
          { id: 'tread', type: 'len', label: 'Shallowest tread depth' },
          { id: 'uniform', type: 'bool', label: 'Risers and treads uniform in each flight?' },
          { id: 'open_risers', type: 'bool', label: 'Any open risers?' },
          { id: 'handrails', type: 'bool', label: 'Handrails on both sides?' },
          { id: 'handrail_height', type: 'len', label: 'Handrail height (top of gripping surface)' }
        ],
        checks: [
          { id: 'st-riser', label: 'Riser height (7 in max)', field: 'riser', ada: ada('504.2', { max: 7 }), mi: mi('504.2', { max: 7 }) },
          { id: 'st-riser-min', label: 'Riser height (4 in min)', field: 'riser_min', ada: ada('504.2', { min: 4 }), mi: mi('504.2', { min: 4 }) },
          { id: 'st-tread', label: 'Tread depth', field: 'tread', ada: ada('504.2', { min: 11 }), mi: mi('504.2', { min: 11 }) },
          { id: 'st-uniform', label: 'Uniform risers and treads', field: 'uniform', ada: ada('504.2', { expect: true }), mi: mi('504.2', { expect: true }) },
          { id: 'st-open', label: 'No open risers', field: 'open_risers', ada: ada('504.3', { expect: false }), mi: mi('504.3', { expect: false }) },
          { id: 'st-rails', label: 'Handrails both sides', field: 'handrails', ada: ada('504.6 and 505.2', { expect: true }), mi: mi('504.6 and 505.2', { expect: true }) },
          { id: 'st-rail-ht', label: 'Handrail height', field: 'handrail_height', ada: ada('505.4', { min: 34, max: 38 }), mi: mi('505.4', { min: 34, max: 38 }) }
        ],
        scopeNote: 'ADA stair requirements apply to stairs that are part of a required means of egress (ADA 210.1).'
      },
      {
        id: 'protruding', label: 'Protruding object / headroom', group: 'Routes',
        fields: [
          { id: 'edge_height', type: 'len', label: 'Height of leading edge above floor' },
          { id: 'protrusion', type: 'len', label: 'How far it sticks out into the route' },
          { id: 'headroom', type: 'len', label: 'Lowest headroom over the route', allowNA: true }
        ],
        checks: [
          { id: 'po-protrude', label: 'Protrusion (4 in max when leading edge is 27 to 80 in high)', field: 'protrusion',
            when: { edge_height: { gt: 27, lt: 80 } }, ada: ada('307.2', { max: 4 }), mi: mi('307.2', { max: 4 }) },
          { id: 'po-head', label: 'Vertical clearance (80 in min)', field: 'headroom',
            ada: ada('307.4', { min: 80 }), mi: mi('307.4', { min: 80 }) }
        ]
      },
      // ---------------------------------------------------------------- Doors
      {
        id: 'door', label: 'Door / doorway', group: 'Doors',
        fields: [
          { id: 'exterior', type: 'bool', label: 'Exterior door?' },
          { id: 'fire_door', type: 'bool', label: 'Fire door?' },
          { id: 'clear_width', type: 'len', label: 'Clear width (door open 90°, face of door to stop)' },
          { id: 'threshold', type: 'len', label: 'Threshold height', allowNA: true },
          { id: 'hw_height', type: 'len', label: 'Hardware height' },
          { id: 'hw_grasp', type: 'bool', label: 'Hardware works with one hand, no tight grasping, pinching or twisting?' },
          { id: 'force', type: 'force', label: 'Opening force (interior hinged door)', allowNA: true },
          { id: 'close_time', type: 'time', label: 'Closing time from 90° to 12°', allowNA: true },
          { id: 'approach', type: 'choice', label: 'Approach measured', options: [
            { id: 'front_pull', label: 'Front approach, pull side' },
            { id: 'front_push', label: 'Front approach, push side' },
            { id: 'other', label: 'Hinge side, latch side or sliding door' }] },
          { id: 'latch_clear', type: 'len', label: 'Clearance beyond latch side (pull side)' },
          { id: 'maneuver_depth', type: 'len', label: 'Maneuvering depth (perpendicular to door)' }
        ],
        checks: [
          { id: 'dr-width', label: 'Clear opening width', field: 'clear_width', ada: ada('404.2.3', { min: 32 }), mi: mi('404.2.3', { min: 32 }) },
          { id: 'dr-thresh', label: 'Threshold height', field: 'threshold', ada: ada('404.2.5', { max: 0.5 }), mi: mi('404.2.5', { max: 0.5 }),
            note: 'Existing or altered thresholds 3/4 in high max with a bevel are allowed (ADA 404.2.5 Exception).' },
          { id: 'dr-hw-ht', label: 'Hardware height', field: 'hw_height', ada: ada('404.2.7', { min: 34, max: 48 }), mi: mi('404.2.7', { min: 34, max: 48 }) },
          { id: 'dr-hw-type', label: 'Hardware operable without tight grasping', field: 'hw_grasp', ada: ada('404.2.7 and 309.4', { expect: true }), mi: mi('404.2.7 and 309.4', { expect: true }) },
          { id: 'dr-force', label: 'Opening force, interior hinged door (5 lbf max)', field: 'force', when: { exterior: false, fire_door: false },
            ada: ada('404.2.9', { max: 5 }), mi: mi('404.2.9', { max: 5 }),
            note: 'Fire doors: minimum force allowed by the authority having jurisdiction. Exterior doors: no maximum set.' },
          { id: 'dr-close', label: 'Door closer speed (5 seconds min, 90° to 12°)', field: 'close_time', ada: ada('404.2.8.1', { min: 5 }), mi: mi('404.2.8.1', { min: 5 }) },
          { id: 'dr-pull-latch', label: 'Pull side: latch-side clearance', field: 'latch_clear', when: { approach: 'front_pull' },
            ada: ada('404.2.4.1 (Table 404.2.4.1)', { min: 18 }), mi: mi('404.2.4.1 (Table 404.2.4.1)', { min: 18 }) },
          { id: 'dr-pull-depth', label: 'Pull side: maneuvering depth', field: 'maneuver_depth', when: { approach: 'front_pull' },
            ada: ada('404.2.4.1 (Table 404.2.4.1)', { min: 60 }), mi: mi('404.2.4.1 (Table 404.2.4.1)', { min: 60 }) },
          { id: 'dr-push-depth', label: 'Push side: maneuvering depth', field: 'maneuver_depth', when: { approach: 'front_push' },
            ada: ada('404.2.4.1 (Table 404.2.4.1)', { min: 48 }), mi: mi('404.2.4.1 (Table 404.2.4.1)', { min: 48 }),
            note: 'Add 12 in latch-side clearance when the door has both a closer and a latch.' },
          { id: 'dr-other', label: 'Maneuvering clearance (hinge side, latch side or sliding)', kind: 'manual', when: { approach: 'other' },
            ada: ada('404.2.4.1 (Table 404.2.4.1)'), mi: mi('404.2.4.1 (Table 404.2.4.1)'),
            note: 'Compare the photos and notes with the table for this approach.' }
        ]
      },
      // ---------------------------------------------------------------- Toilet rooms
      {
        id: 'toilet', label: 'Toilet (water closet) and grab bars', group: 'Toilet rooms',
        fields: [
          { id: 'centerline', type: 'len', label: 'Toilet centerline to side wall' },
          { id: 'seat_height', type: 'len', label: 'Seat height (floor to top of seat)' },
          { id: 'clear_width', type: 'len', label: 'Clearance width (from side wall)' },
          { id: 'clear_depth', type: 'len', label: 'Clearance depth (from rear wall)' },
          { id: 'side_gb_len', type: 'len', label: 'Side grab bar length' },
          { id: 'side_gb_rear', type: 'len', label: 'Rear wall to near end of side grab bar' },
          { id: 'side_gb_reach', type: 'len', label: 'Rear wall to far end of side grab bar' },
          { id: 'rear_gb_len', type: 'len', label: 'Rear grab bar length' },
          { id: 'rear_gb_split', type: 'bool', label: 'Rear bar extends 12 in min on one side of centerline and 24 in min on the other?' },
          { id: 'gb_height', type: 'len', label: 'Grab bar height (top of gripping surface)' },
          { id: 'tp_front', type: 'len', label: 'Front of toilet to centerline of paper dispenser' },
          { id: 'tp_outlet', type: 'len', label: 'Paper dispenser outlet height' },
          { id: 'flush_open', type: 'bool', label: 'Flush control on the open (wide) side, or automatic?' },
          { id: 'stall', type: 'bool', label: 'In a stall (compartment)?' },
          { id: 'mount', type: 'choice', label: 'Toilet mounting', options: [{ id: 'wall', label: 'Wall-hung' }, { id: 'floor', label: 'Floor-mounted' }] },
          { id: 'stall_width', type: 'len', label: 'Stall width' },
          { id: 'stall_depth', type: 'len', label: 'Stall depth' }
        ],
        checks: [
          { id: 'wc-cl', label: 'Toilet centerline from side wall', field: 'centerline', ada: ada('604.2', { min: 16, max: 18 }), mi: mi('604.2', { min: 16, max: 18 }) },
          { id: 'wc-seat', label: 'Seat height', field: 'seat_height', ada: ada('604.4', { min: 17, max: 19 }), mi: mi('604.4', { min: 17, max: 19 }) },
          { id: 'wc-clr-w', label: 'Clearance width', field: 'clear_width', ada: ada('604.3.1', { min: 60 }), mi: mi('604.3.1', { min: 60 }) },
          { id: 'wc-clr-d', label: 'Clearance depth', field: 'clear_depth', ada: ada('604.3.1', { min: 56 }), mi: mi('604.3.1', { min: 56 }) },
          { id: 'wc-sgb-len', label: 'Side grab bar length', field: 'side_gb_len', ada: ada('604.5.1', { min: 42 }), mi: mi('604.5.1', { min: 42 }) },
          { id: 'wc-sgb-rear', label: 'Side grab bar distance from rear wall', field: 'side_gb_rear', ada: ada('604.5.1', { max: 12 }), mi: mi('604.5.1', { max: 12 }) },
          { id: 'wc-sgb-reach', label: 'Side grab bar extends from rear wall', field: 'side_gb_reach', ada: ada('604.5.1', { min: 54 }), mi: mi('604.5.1', { min: 54 }) },
          { id: 'wc-rgb-len', label: 'Rear grab bar length', field: 'rear_gb_len', ada: ada('604.5.2', { min: 36 }), mi: mi('604.5.2', { min: 36 }) },
          { id: 'wc-rgb-split', label: 'Rear grab bar position', field: 'rear_gb_split', ada: ada('604.5.2', { expect: true }), mi: mi('604.5.2', { expect: true }) },
          { id: 'wc-gb-ht', label: 'Grab bar height', field: 'gb_height', ada: ada('609.4', { min: 33, max: 36 }), mi: mi('609.4', { min: 33, max: 36 }) },
          { id: 'wc-tp-front', label: 'Paper dispenser location (7 to 9 in in front of toilet)', field: 'tp_front', ada: ada('604.7', { min: 7, max: 9 }), mi: mi('604.7', { min: 7, max: 9 }) },
          { id: 'wc-tp-ht', label: 'Paper dispenser outlet height', field: 'tp_outlet', ada: ada('604.7', { min: 15, max: 48 }), mi: mi('604.7', { min: 15, max: 48 }) },
          { id: 'wc-flush', label: 'Flush control location', field: 'flush_open', ada: ada('604.6', { expect: true }), mi: mi('604.6', { expect: true }) },
          { id: 'wc-stall-w', label: 'Wheelchair stall width', field: 'stall_width', when: { stall: true },
            ada: ada('604.8.1.1', { min: 60 }), mi: mi('604.9.1', { min: 60 }) },
          { id: 'wc-stall-d-wall', label: 'Wheelchair stall depth (wall-hung toilet)', field: 'stall_depth', when: { stall: true, mount: 'wall' },
            ada: ada('604.8.1.1', { min: 56 }), mi: mi('604.9.1', { min: 56 }) },
          { id: 'wc-stall-d-floor', label: 'Wheelchair stall depth (floor-mounted toilet)', field: 'stall_depth', when: { stall: true, mount: 'floor' },
            ada: ada('604.8.1.1', { min: 59 }), mi: mi('604.9.1', { min: 59 }) }
        ]
      },
      {
        id: 'toilet_room', label: 'Toilet room (turning space)', group: 'Toilet rooms',
        fields: [
          { id: 'turn_shape', type: 'choice', label: 'Turning space type', options: [{ id: 'circle', label: 'Circle' }, { id: 't', label: 'T-shaped' }] },
          { id: 'turn_dia', type: 'len', label: 'Largest clear turning circle diameter' },
          { id: 'door_swing', type: 'bool', label: 'Door swings into the clear floor space of any fixture?' }
        ],
        checks: [
          { id: 'tr-turn', label: 'Turning space (circle)', field: 'turn_dia', when: { turn_shape: 'circle' },
            ada: ada('304.3.1', { min: 60 }), mi: mi('304.3.1', { min: 67 }, { newBuilding: true, elseMin: 60 }),
            note: 'A117.1-2017 raised the circle to 67 in for new buildings; existing buildings keep 60 in.' },
          { id: 'tr-turn-t', label: 'Turning space (T-shaped)', kind: 'manual', when: { turn_shape: 't' },
            ada: ada('304.3.2'), mi: mi('304.3.2'), note: 'Check the T dimensions against the photos; A117.1-2017 enlarged the T for new buildings.' },
          { id: 'tr-swing', label: 'Door does not swing into fixture clear floor space', field: 'door_swing',
            ada: ada('603.2.3', { expect: false }), mi: mi('603.2.3', { expect: false }),
            note: 'Allowed in single-user rooms where a clear floor space is provided beyond the door swing (ADA 603.2.3 Exception 2).' }
        ]
      },
      {
        id: 'lavatory', label: 'Lavatory (sink) and mirror', group: 'Toilet rooms',
        fields: [
          { id: 'rim', type: 'len', label: 'Rim or counter height (whichever is higher)' },
          { id: 'knee', type: 'len', label: 'Knee clearance height' },
          { id: 'pipes', type: 'bool', label: 'Pipes under sink insulated or protected?' },
          { id: 'faucet', type: 'bool', label: 'Faucet works with one hand, no tight grasping, 5 lbf max?' },
          { id: 'mirror', type: 'len', label: 'Bottom of mirror reflecting surface', allowNA: true },
          { id: 'cfs_width', type: 'len', label: 'Clear floor space width (forward approach)' },
          { id: 'cfs_depth', type: 'len', label: 'Clear floor space depth (forward approach)' }
        ],
        checks: [
          { id: 'lv-rim', label: 'Rim / counter height', field: 'rim', ada: ada('606.3', { max: 34 }), mi: mi('606.3', { max: 34 }) },
          { id: 'lv-knee', label: 'Knee clearance height', field: 'knee', ada: ada('306.3.3', { min: 27 }), mi: mi('306.3.3', { min: 27 }) },
          { id: 'lv-pipes', label: 'Exposed pipes protected', field: 'pipes', ada: ada('606.5', { expect: true }), mi: mi('606.6', { expect: true }) },
          { id: 'lv-faucet', label: 'Faucet operable parts', field: 'faucet', ada: ada('606.4 and 309.4', { expect: true }), mi: mi('606.4 and 309.4', { expect: true }) },
          { id: 'lv-mirror', label: 'Mirror above lavatory, bottom of reflecting surface', field: 'mirror', ada: ada('603.3', { max: 40 }), mi: mi('603.3', { max: 40 }) },
          { id: 'lv-cfs-w', label: 'Clear floor space width', field: 'cfs_width', ada: ada('305.3', { min: 30 }), mi: mi('305.3', { min: 30 }) },
          { id: 'lv-cfs-d', label: 'Clear floor space depth', field: 'cfs_depth',
            ada: ada('305.3', { min: 48 }), mi: mi('305.3', { min: 52 }, { newBuilding: true, elseMin: 48 }),
            note: 'A117.1-2017 raised clear floor space to 30 x 52 in for new buildings; existing buildings keep 30 x 48 in.' }
        ]
      },
      {
        id: 'urinal', label: 'Urinal', group: 'Toilet rooms',
        fields: [
          { id: 'rim', type: 'len', label: 'Rim height' },
          { id: 'flush', type: 'len', label: 'Flush control height' }
        ],
        checks: [
          { id: 'ur-rim', label: 'Rim height', field: 'rim', ada: ada('605.2', { max: 17 }), mi: mi('605.2', { max: 17 }) },
          { id: 'ur-flush', label: 'Flush control height', field: 'flush', ada: ada('605.4 and 308', { max: 48 }), mi: mi('605.4 and 308', { max: 48 }) }
        ]
      },
      // ---------------------------------------------------------------- Elements and spaces
      {
        id: 'operable', label: 'Switch, control or dispenser (reach range)', group: 'Elements',
        fields: [
          { id: 'reach', type: 'choice', label: 'Approach', options: [
            { id: 'clear', label: 'Forward or side reach, nothing in the way' },
            { id: 'obstructed', label: 'Reach over a counter or obstruction' }] },
          { id: 'high', type: 'len', label: 'Height of highest operable part' },
          { id: 'low', type: 'len', label: 'Height of lowest operable part' },
          { id: 'grasp', type: 'bool', label: 'Works with one hand, no tight grasping, pinching or twisting?' },
          { id: 'force', type: 'force', label: 'Operating force', allowNA: true }
        ],
        checks: [
          { id: 'op-high', label: 'High reach (48 in max)', field: 'high', when: { reach: 'clear' }, ada: ada('308.2.1 and 308.3.1', { max: 48 }), mi: mi('308.2.1 and 308.3.1', { max: 48 }) },
          { id: 'op-low', label: 'Low reach (15 in min)', field: 'low', when: { reach: 'clear' }, ada: ada('308.2.1 and 308.3.1', { min: 15 }), mi: mi('308.2.1 and 308.3.1', { min: 15 }) },
          { id: 'op-obst', label: 'Reach over an obstruction', kind: 'manual', when: { reach: 'obstructed' },
            ada: ada('308.2.2 and 308.3.2'), mi: mi('308.2.2 and 308.3.2'), note: 'Allowed height depends on the depth of the obstruction.' },
          { id: 'op-grasp', label: 'Operable without tight grasping', field: 'grasp', ada: ada('309.4', { expect: true }), mi: mi('309.4', { expect: true }) },
          { id: 'op-force', label: 'Operating force', field: 'force', ada: ada('309.4', { max: 5 }), mi: mi('309.4', { max: 5 }) }
        ]
      },
      {
        id: 'signage', label: 'Room sign (tactile)', group: 'Elements',
        fields: [
          { id: 'low', type: 'len', label: 'Floor to baseline of lowest tactile character' },
          { id: 'high', type: 'len', label: 'Floor to baseline of highest tactile character' },
          { id: 'latch', type: 'bool', label: 'Mounted on the latch side of the door?' },
          { id: 'clear18', type: 'bool', label: '18 x 18 in clear floor space centered on sign, outside door swing?' },
          { id: 'raised', type: 'bool', label: 'Raised characters present?' },
          { id: 'braille', type: 'bool', label: 'Braille present below the text?' },
          { id: 'finish', type: 'bool', label: 'Non-glare finish with high contrast?' }
        ],
        checks: [
          { id: 'sg-low', label: 'Lowest tactile character baseline (48 in min)', field: 'low', ada: ada('703.4.1', { min: 48 }), mi: mi('703.3.10', { min: 48 }) },
          { id: 'sg-high', label: 'Highest tactile character baseline (60 in max)', field: 'high', ada: ada('703.4.1', { max: 60 }), mi: mi('703.3.10', { max: 60 }) },
          { id: 'sg-latch', label: 'Sign on latch side', field: 'latch', ada: ada('703.4.2', { expect: true }), mi: mi('703.3.11', { expect: true }) },
          { id: 'sg-clear', label: 'Clear floor space at sign', field: 'clear18', ada: ada('703.4.2', { expect: true }), mi: mi('703.3.11', { expect: true }) },
          { id: 'sg-raised', label: 'Raised characters', field: 'raised', ada: ada('703.2', { expect: true }), mi: mi('703.3', { expect: true }) },
          { id: 'sg-braille', label: 'Braille', field: 'braille', ada: ada('703.3', { expect: true }), mi: mi('703.4', { expect: true }) },
          { id: 'sg-finish', label: 'Finish and contrast', field: 'finish', ada: ada('703.5.1', { expect: true }), mi: mi('703.2.10 and 703.2.11', { expect: true }) }
        ]
      },
      {
        id: 'counter', label: 'Sales or service counter', group: 'Elements',
        fields: [
          { id: 'approach', type: 'choice', label: 'Approach', options: [{ id: 'parallel', label: 'Parallel (side)' }, { id: 'forward', label: 'Forward' }] },
          { id: 'height', type: 'len', label: 'Height of accessible counter portion' },
          { id: 'length', type: 'len', label: 'Length of accessible counter portion' },
          { id: 'knee', type: 'len', label: 'Knee clearance height (forward approach)' }
        ],
        checks: [
          { id: 'ct-height', label: 'Counter height (36 in max)', field: 'height', ada: ada('904.4.1 and 904.4.2', { max: 36 }), mi: mi('904.3', { max: 36 }) },
          { id: 'ct-len-par', label: 'Counter length, parallel approach', field: 'length', when: { approach: 'parallel' }, ada: ada('904.4.1', { min: 36 }), mi: mi('904.3.2', { min: 36 }) },
          { id: 'ct-len-fwd', label: 'Counter length, forward approach', field: 'length', when: { approach: 'forward' }, ada: ada('904.4.2', { min: 30 }), mi: mi('904.3.3', { min: 30 }) },
          { id: 'ct-knee', label: 'Knee clearance, forward approach', field: 'knee', when: { approach: 'forward' }, ada: ada('904.4.2 and 306.3', { min: 27 }), mi: mi('904.3.3 and 306.3', { min: 27 }) }
        ]
      },
      {
        id: 'work_surface', label: 'Dining or work surface', group: 'Elements',
        fields: [
          { id: 'height', type: 'len', label: 'Top of surface height' },
          { id: 'knee', type: 'len', label: 'Knee clearance height' }
        ],
        checks: [
          { id: 'ws-height', label: 'Surface height (28 to 34 in)', field: 'height', ada: ada('902.3', { min: 28, max: 34 }), mi: mi('902.3', { min: 28, max: 34 }) },
          { id: 'ws-knee', label: 'Knee clearance', field: 'knee', ada: ada('902.2 and 306.3', { min: 27 }), mi: mi('902.2 and 306.3', { min: 27 }) }
        ]
      },
      {
        id: 'fountain', label: 'Drinking fountain', group: 'Elements',
        fields: [
          { id: 'wc_spout', type: 'len', label: 'Wheelchair unit: spout outlet height', allowNA: true },
          { id: 'stand_spout', type: 'len', label: 'Standing unit: spout outlet height', allowNA: true },
          { id: 'both', type: 'bool', label: 'Both a wheelchair-height and a standing-height unit provided?' }
        ],
        checks: [
          { id: 'df-wc', label: 'Wheelchair spout height (36 in max)', field: 'wc_spout', ada: ada('602.4', { max: 36 }), mi: mi('602.4', { max: 36 }) },
          { id: 'df-stand', label: 'Standing spout height (38 to 43 in)', field: 'stand_spout', ada: ada('602.7', { min: 38, max: 43 }), mi: mi('602.7', { min: 38, max: 43 }) },
          { id: 'df-both', label: 'Two heights provided', field: 'both', ada: ada('211.2', { expect: true }), mi: { cite: '2021 MBC §1109.5.1', expect: true, verify: true } }
        ]
      },
      {
        id: 'other', label: 'Other observation (photo and notes only)', group: 'Other',
        fields: [],
        checks: [
          { id: 'ot-manual', label: 'Consultant observation', kind: 'manual', ada: { cite: 'ADA 2010 and Michigan: sections to be identified by the consultant' },
            note: 'No automatic check for this element. Identify the applicable sections from the photos and notes.' }
        ]
      }
    ]
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = RULES;
  else root.DNEM_RULES = RULES;
})(this);
