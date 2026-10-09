/* DNEM ADA Lens - rules table
 *
 * One entry per element type. "fields" are what the phone app asks for.
 * "checks" compare those fields against two codes:
 *   ada : 2010 ADA Standards for Accessible Design (DOJ). Section numbers are the 2010 Standards.
 *   aba : federal Architectural Barriers Act standards, Chapter 10 (trails, park paths, beaches, picnic and
 *         camping). ABA-only checks are required when visit.federalFunds is 'yes', best practice when 'no',
 *         and "Needs manual input" when unknown.
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
  function ada(sec, lim) { return Object.assign({ cite: 'ADA 2010 §' + sec }, lim || {}); } // lim.verify = true marks an ADA section to double-check
  // Federal Architectural Barriers Act standards, outdoor developed areas (Chapter 10). Section numbers to confirm.
  function aba(sec, lim) { return Object.assign({ cite: 'ABA §' + sec, verify: true }, lim || {}); }
  function mi(sec, lim, opts) {
    return Object.assign({ cite: MI + ' §' + sec, verify: true }, lim || {}, opts || {});
  }

  var RULES = {
    version: '2026-10-09.3',
    codes: {
      ada: { short: 'ADA 2010', name: '2010 ADA Standards for Accessible Design' },
      aba: { short: 'ABA', name: 'Architectural Barriers Act Accessibility Standards, Chapter 10 (outdoor developed areas)' },
      mi: {
        short: 'Michigan',
        name: '2021 Michigan Building Code, Chapter 11 (adopts ICC A117.1-2017), effective April 9, 2025',
        note: 'Michigan Administrative Code R 408.30427 adopts ICC A117.1 except sections 611 and 707.'
      }
    },
    federalFunds: [
      { id: 'yes', label: 'Yes: federal agency, or federal money that requires the ABA standards (for example a federal grant to DNR)' },
      { id: 'no', label: 'No federal money' },
      { id: 'unknown', label: 'Not known' }
    ],
    visitTypes: [
      { id: 'site', label: 'Building or site' },
      { id: 'polling', label: 'Polling place (follows the DOJ polling place checklist)' }
    ],
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
      // ================================================================ Outdoor site elements
      {
        id: 'curb_ramp', label: 'Curb ramp', group: 'Routes',
        fields: [
          { id: 'running_slope', type: 'slope', label: 'Running slope' },
          { id: 'cross_slope', type: 'slope', label: 'Cross slope' },
          { id: 'width', type: 'len', label: 'Clear width (not counting flares)' },
          { id: 'flare_slope', type: 'slope', label: 'Flared side slope (measured along the curb)', allowNA: true },
          { id: 'counter_slope', type: 'slope', label: 'Gutter / road counter slope at the ramp', allowNA: true },
          { id: 'landing', type: 'len', label: 'Top landing length' },
          { id: 'flush', type: 'bool', label: 'Ramp meets walk, gutter and street flush (no lip)?' }
        ],
        checks: [
          { id: 'cr-run', label: 'Running slope (1:12 max)', field: 'running_slope', ada: ada('406.1 and 405.2', { max: 8.33 }), mi: mi('406.1 and 405.2', { max: 8.33 }) },
          { id: 'cr-cross', label: 'Cross slope (1:48 max)', field: 'cross_slope', ada: ada('406.1 and 405.3', { max: 2.08 }), mi: mi('406.1 and 405.3', { max: 2.08 }) },
          { id: 'cr-width', label: 'Clear width', field: 'width', ada: ada('406.1 and 405.5', { min: 36 }), mi: mi('406.1 and 405.5', { min: 36 }) },
          { id: 'cr-flare', label: 'Flared sides (1:10 max)', field: 'flare_slope', ada: ada('406.3', { max: 10 }), mi: mi('406.3', { max: 10 }),
            note: 'Applies where the flares are part of a pedestrian route; returned curbs are allowed where pedestrians would not cross the sides.' },
          { id: 'cr-counter', label: 'Counter slope (1:20 max)', field: 'counter_slope', ada: ada('406.2', { max: 5 }), mi: mi('406.2', { max: 5 }) },
          { id: 'cr-landing', label: 'Top landing length', field: 'landing', ada: ada('406.4', { min: 36 }), mi: mi('406.4', { min: 36 }) },
          { id: 'cr-flush', label: 'Flush transitions', field: 'flush', ada: ada('406.2', { expect: true }), mi: mi('406.2', { expect: true }) }
        ]
      },
      {
        id: 'loading_zone', label: 'Passenger loading zone (drop-off)', group: 'Site',
        fields: [
          { id: 'pullup_width', type: 'len', label: 'Vehicle pull-up space width' },
          { id: 'aisle_width', type: 'len', label: 'Access aisle width' },
          { id: 'aisle_length', type: 'len', label: 'Access aisle length (20 ft = 240 in)' },
          { id: 'slope', type: 'slope', label: 'Steepest slope in pull-up space or aisle' },
          { id: 'marked', type: 'bool', label: 'Access aisle marked to discourage parking?' },
          { id: 'clearance', type: 'len', label: 'Vertical clearance (canopies, porte-cocheres)', allowNA: true }
        ],
        checks: [
          { id: 'lz-pullup', label: 'Pull-up space width', field: 'pullup_width', ada: ada('503.2', { min: 96 }), mi: mi('503.2', { min: 96 }) },
          { id: 'lz-aisle-w', label: 'Access aisle width', field: 'aisle_width', ada: ada('503.3.1', { min: 60 }), mi: mi('503.3', { min: 60 }) },
          { id: 'lz-aisle-l', label: 'Access aisle length (full 20 ft pull-up space)', field: 'aisle_length', ada: ada('503.2 and 503.3.2', { min: 240 }), mi: mi('503.2 and 503.3', { min: 240 }) },
          { id: 'lz-slope', label: 'Slope (1:48 max)', field: 'slope', ada: ada('503.4', { max: 2.08 }), mi: mi('503.4', { max: 2.08 }) },
          { id: 'lz-marked', label: 'Access aisle marked', field: 'marked', ada: ada('503.3.3', { expect: true }), mi: mi('503.3', { expect: true }) },
          { id: 'lz-clear', label: 'Vertical clearance', field: 'clearance', ada: ada('503.5', { min: 114 }), mi: mi('503.5', { min: 114 }) }
        ]
      },
      {
        id: 'bus_stop', label: 'Bus stop boarding area', group: 'Site',
        scopeNote: 'Applies to bus stops built or altered by a public entity (ADA 810.2).',
        fields: [
          { id: 'depth', type: 'len', label: 'Clear depth, perpendicular to the curb' },
          { id: 'width', type: 'len', label: 'Clear width, along the curb' },
          { id: 'slope', type: 'slope', label: 'Slope perpendicular to the road' },
          { id: 'route', type: 'bool', label: 'Connected to streets, sidewalks or paths by an accessible route?' }
        ],
        checks: [
          { id: 'bs-depth', label: 'Boarding area depth', field: 'depth', ada: ada('810.2.2', { min: 96 }), mi: mi('810.2.2', { min: 96 }) },
          { id: 'bs-width', label: 'Boarding area width', field: 'width', ada: ada('810.2.2', { min: 60 }), mi: mi('810.2.2', { min: 60 }) },
          { id: 'bs-slope', label: 'Slope perpendicular to the road (1:48 max)', field: 'slope', ada: ada('810.2.4', { max: 2.08 }), mi: mi('810.2.4', { max: 2.08 }) },
          { id: 'bs-route', label: 'Connected by accessible route', field: 'route', ada: ada('810.2.3', { expect: true }), mi: mi('810.2.3', { expect: true }) }
        ]
      },
      {
        id: 'entrance_signs', label: 'Entrance signs (symbol and directions)', group: 'Doors',
        fields: [
          { id: 'isa', type: 'bool', label: 'Accessible entrance marked with the International Symbol of Accessibility?' },
          { id: 'directional', type: 'bool', label: 'Entrances that are not accessible have signs pointing to the accessible one?', allowNA: true }
        ],
        checks: [
          { id: 'es-isa', label: 'Accessible entrance identified', field: 'isa', ada: ada('216.6', { expect: true }), mi: { cite: '2021 MBC §1112.1', expect: true, verify: true } },
          { id: 'es-dir', label: 'Directional signs at other entrances', field: 'directional', ada: ada('216.6', { expect: true }), mi: { cite: '2021 MBC §1112.2', expect: true, verify: true },
            note: 'Not required where every entrance is accessible.' }
        ]
      },
      // ================================================================ Play areas (ADA 240 and 1008)
      {
        id: 'play_area', label: 'Play area (overall counts and surfaces)', group: 'Recreation',
        fields: [
          { id: 'elevated_total', type: 'count', label: 'Elevated play components (reached by ramp, transfer system or steps)' },
          { id: 'elevated_route', type: 'count', label: 'Elevated components on an accessible route (ramp or transfer system)' },
          { id: 'elevated_ramp', type: 'count', label: 'Elevated components reached by a ramp' },
          { id: 'ground_types', type: 'count', label: 'Different types of ground-level components on an accessible route' },
          { id: 'route', type: 'bool', label: 'Accessible route connects the play area to the site?' },
          { id: 'ground_width', type: 'len', label: 'Narrowest ground-level route inside the play area' },
          { id: 'surface_access', type: 'bool', label: 'Surfacing on routes is accessible (ASTM F1951 documentation, or firm and stable)?' },
          { id: 'surface_impact', type: 'bool', label: 'Surfacing inside use zones is impact-attenuating (ASTM F1292)?' },
          { id: 'turning', type: 'bool', label: 'Turning space at each level that has elevated components on a route?' }
        ],
        checks: [
          { id: 'pa-route', label: 'Play area on an accessible route', field: 'route', ada: ada('206.2.17', { expect: true }), mi: { cite: '2021 MBC §1104 and §1110', expect: true, verify: true } },
          { id: 'pa-elev', label: 'At least 50% of elevated components on an accessible route', kind: 'ratio', num: 'elevated_route', den: 'elevated_total', minPct: 50,
            ada: ada('240.2.2'), mi: mi('1108 (play areas)') },
          { id: 'pa-ramp', label: 'With 20 or more elevated components, at least 25% reached by ramp', kind: 'ratio', num: 'elevated_ramp', den: 'elevated_total', minPct: 25,
            when: { elevated_total: { gt: 19 } }, ada: ada('240.2.2.1'), mi: mi('1108 (play areas)') },
          { id: 'pa-ground', label: 'Ground-level components: number and types', kind: 'manual', ada: ada('240.2.1 (Table 240.2.1.2)'), mi: mi('1108 (play areas)'),
            note: 'At least one of each type of ground-level component must be on a route; Table 240.2.1.2 adds more based on the number of elevated components. Compare with the counts recorded.' },
          { id: 'pa-gwidth', label: 'Ground-level route width', field: 'ground_width', ada: ada('1008.2.4.1', { min: 60, verify: true }), mi: mi('1108.2.4.1', { min: 60 }),
            note: 'May narrow to 36 in for 60 in max length in play areas under 1,000 sq ft, with conditions (ADA 1008.2.4.1 Exceptions).' },
          { id: 'pa-surf', label: 'Accessible surfacing', field: 'surface_access', ada: ada('1008.2.6.1', { expect: true }), mi: mi('1108.2.6.1', { expect: true }) },
          { id: 'pa-impact', label: 'Impact-attenuating surfacing in use zones', field: 'surface_impact', ada: ada('1008.2.6.2', { expect: true }), mi: mi('1108.2.6.2', { expect: true }) },
          { id: 'pa-turn', label: 'Turning space', field: 'turning', ada: ada('1008.4.1', { expect: true, verify: true }), mi: mi('1108.4.1', { expect: true }) }
        ],
        scopeNote: 'Michigan\'s Playground Equipment Safety Act (1997 PA 16) covers equipment safety, not accessibility; it is not checked here.'
      },
      {
        id: 'play_ramp', label: 'Play area ramp or elevated route', group: 'Recreation',
        fields: [
          { id: 'level', type: 'choice', label: 'Ramp serves', options: [{ id: 'ground', label: 'Ground-level components' }, { id: 'elevated', label: 'Elevated components' }] },
          { id: 'running_slope', type: 'slope', label: 'Running slope' },
          { id: 'rise', type: 'len', label: 'Rise of this ramp run' },
          { id: 'width', type: 'len', label: 'Clear width' },
          { id: 'handrail_height', type: 'len', label: 'Handrail height (top of gripping surface)', allowNA: true }
        ],
        checks: [
          { id: 'pr-slope-g', label: 'Ground-level ramp slope (1:16 max)', field: 'running_slope', when: { level: 'ground' }, ada: ada('1008.2.5.1', { max: 6.25, verify: true }), mi: mi('1108.2.5.1', { max: 6.25 }) },
          { id: 'pr-slope-e', label: 'Elevated ramp slope (1:12 max)', field: 'running_slope', when: { level: 'elevated' }, ada: ada('1008.2.5 and 405.2', { max: 8.33, verify: true }), mi: mi('1108.2.5 and 405.2', { max: 8.33 }) },
          { id: 'pr-rise', label: 'Rise per run, elevated (12 in max)', field: 'rise', when: { level: 'elevated' }, ada: ada('1008.2.5.2', { max: 12, verify: true }), mi: mi('1108.2.5.2', { max: 12 }) },
          { id: 'pr-width', label: 'Elevated route width', field: 'width', when: { level: 'elevated' }, ada: ada('1008.2.4.2', { min: 36, verify: true }), mi: mi('1108.2.4.2', { min: 36 }) },
          { id: 'pr-width-g', label: 'Ground-level route width', field: 'width', when: { level: 'ground' }, ada: ada('1008.2.4.1', { min: 60, verify: true }), mi: mi('1108.2.4.1', { min: 60 }) },
          { id: 'pr-rail', label: 'Handrail height (20 to 28 in)', field: 'handrail_height', ada: ada('1008.2.5.3', { min: 20, max: 28, verify: true }), mi: mi('1108.2.5.3', { min: 20, max: 28 }),
            note: 'Handrails are not required on ramps inside ground-level use zones (ADA 1008.2.5.3 Exception).' }
        ]
      },
      {
        id: 'play_transfer', label: 'Play area transfer platform or transfer steps', group: 'Recreation',
        fields: [
          { id: 'kind', type: 'choice', label: 'Type', options: [{ id: 'platform', label: 'Transfer platform' }, { id: 'step', label: 'Transfer step' }] },
          { id: 'height', type: 'len', label: 'Height of platform or step' },
          { id: 'width', type: 'len', label: 'Clear width of platform or step' },
          { id: 'depth', type: 'len', label: 'Clear depth of platform or step' },
          { id: 'supports', type: 'bool', label: 'Transfer supports (handholds) provided?' }
        ],
        checks: [
          { id: 'pt-h-plat', label: 'Transfer platform height (11 to 18 in)', field: 'height', when: { kind: 'platform' }, ada: ada('1008.3.1.1', { min: 11, max: 18, verify: true }), mi: mi('1108.3.1.1', { min: 11, max: 18 }) },
          { id: 'pt-h-step', label: 'Transfer step height (8 in max)', field: 'height', when: { kind: 'step' }, ada: ada('1008.3.2.1', { max: 8, verify: true }), mi: mi('1108.3.2.1', { max: 8 }) },
          { id: 'pt-w', label: 'Clear width (24 in min)', field: 'width', ada: ada('1008.3.1.2 and 1008.3.2.2', { min: 24, verify: true }), mi: mi('1108.3.1.2 and 1108.3.2.2', { min: 24 }) },
          { id: 'pt-d', label: 'Clear depth (14 in min)', field: 'depth', ada: ada('1008.3.1.2 and 1008.3.2.2', { min: 14, verify: true }), mi: mi('1108.3.1.2 and 1108.3.2.2', { min: 14 }) },
          { id: 'pt-sup', label: 'Transfer supports', field: 'supports', ada: ada('1008.3.1.4 and 1008.3.2.3', { expect: true, verify: true }), mi: mi('1108.3.1.4 and 1108.3.2.3', { expect: true }) }
        ]
      },
      {
        id: 'play_component', label: 'Play component (swing, spring rider, play table…)', group: 'Recreation',
        fields: [
          { id: 'kind', type: 'choice', label: 'Component', options: [{ id: 'seat', label: 'Seat or entry point (swing, rider, slide entry)' }, { id: 'table', label: 'Play table' }] },
          { id: 'route', type: 'bool', label: 'On an accessible route?' },
          { id: 'cfs', type: 'bool', label: '30 x 48 in clear space at the component, same level?' },
          { id: 'entry_height', type: 'len', label: 'Height of seat or entry point' },
          { id: 'table_height', type: 'len', label: 'Play table rim or surface height' },
          { id: 'table_knee', type: 'len', label: 'Play table knee clearance height' }
        ],
        checks: [
          { id: 'pc-route', label: 'On an accessible route', field: 'route', ada: ada('240.2 and 1008.2', { expect: true }), mi: mi('1108.2', { expect: true }) },
          { id: 'pc-cfs', label: 'Clear floor space', field: 'cfs', ada: ada('1008.4.2', { expect: true, verify: true }), mi: mi('1108.4.2', { expect: true }) },
          { id: 'pc-entry', label: 'Seat or entry point height (11 to 24 in)', field: 'entry_height', when: { kind: 'seat' }, ada: ada('1008.4.4', { min: 11, max: 24, verify: true }), mi: mi('1108.4.4', { min: 11, max: 24 }) },
          { id: 'pc-table', label: 'Play table height (31 in max)', field: 'table_height', when: { kind: 'table' }, ada: ada('1008.4.3', { max: 31, verify: true }), mi: mi('1108.4.3', { max: 31 }) },
          { id: 'pc-knee', label: 'Play table knee clearance (24 in min)', field: 'table_knee', when: { kind: 'table' }, ada: ada('1008.4.3', { min: 24, verify: true }), mi: mi('1108.4.3', { min: 24 }),
            note: 'Tables for children under 5 may use a parallel approach instead of knee clearance (ADA 1008.4.3 Exception).' }
        ]
      },
      // ================================================================ Pools and spas (ADA 242 and 1009)
      {
        id: 'pool', label: 'Swimming pool, wading pool or spa (entries)', group: 'Recreation',
        fields: [
          { id: 'kind', type: 'choice', label: 'Type', options: [{ id: 'pool', label: 'Swimming pool' }, { id: 'wading', label: 'Wading pool' }, { id: 'spa', label: 'Spa / hot tub' }] },
          { id: 'wall_ft', type: 'count', label: 'Pool wall length in feet (swimming pools)' },
          { id: 'primary', type: 'count', label: 'Pool lifts and sloped entries' },
          { id: 'secondary', type: 'count', label: 'Other accessible entries (transfer wall, transfer system, accessible stairs)' },
          { id: 'wading_slope', type: 'bool', label: 'Wading pool has a sloped entry?' }
        ],
        checks: [
          { id: 'pl-entries', label: 'Accessible means of entry (number and type)', kind: 'poolEntries', fields: ['kind', 'wall_ft', 'primary', 'secondary'],
            ada: ada('242.2 and 242.4'), mi: { cite: '2021 MBC §1110 (pools); ' + MI + ' §1109', verify: true } },
          { id: 'pl-wading', label: 'Wading pool sloped entry', field: 'wading_slope', when: { kind: 'wading' }, ada: ada('242.3', { expect: true }), mi: { cite: '2021 MBC §1110; ' + MI + ' §1109', expect: true, verify: true } }
        ]
      },
      {
        id: 'pool_lift', label: 'Pool lift', group: 'Recreation',
        fields: [
          { id: 'water_depth', type: 'len', label: 'Water depth at the lift' },
          { id: 'seat_height', type: 'len', label: 'Seat height above the deck (top of seat, in loading position)' },
          { id: 'seat_width', type: 'len', label: 'Seat width' },
          { id: 'submerge', type: 'len', label: 'Seat depth below still water when lowered' },
          { id: 'footrest', type: 'bool', label: 'Footrest that moves with the seat?' },
          { id: 'operable', type: 'bool', label: 'User can operate it unassisted from deck and water?' },
          { id: 'capacity', type: 'count', label: 'Rated capacity (lb)' },
          { id: 'deck', type: 'bool', label: 'Clear deck space beside the seat, slope 1:48 max?' }
        ],
        checks: [
          { id: 'lf-depth', label: 'Located where water is 48 in deep max', field: 'water_depth', ada: ada('1009.2.1', { max: 48 }), mi: mi('1109.2.1', { max: 48 }),
            note: 'Exception where the entire pool is deeper than 48 in.' },
          { id: 'lf-seat', label: 'Seat height (16 to 19 in)', field: 'seat_height', ada: ada('1009.2.3', { min: 16, max: 19, verify: true }), mi: mi('1109.2.3', { min: 16, max: 19 }) },
          { id: 'lf-width', label: 'Seat width (16 in min)', field: 'seat_width', ada: ada('1009.2.4', { min: 16, verify: true }), mi: mi('1109.2.4', { min: 16 }) },
          { id: 'lf-sub', label: 'Submerged depth (18 in min)', field: 'submerge', ada: ada('1009.2.8', { min: 18, verify: true }), mi: mi('1109.2.8', { min: 18 }) },
          { id: 'lf-foot', label: 'Footrest', field: 'footrest', ada: ada('1009.2.5', { expect: true, verify: true }), mi: mi('1109.2.5', { expect: true }) },
          { id: 'lf-op', label: 'Independent operation', field: 'operable', ada: ada('1009.2.7', { expect: true, verify: true }), mi: mi('1109.2.7', { expect: true }) },
          { id: 'lf-cap', label: 'Lifting capacity (300 lb min)', field: 'capacity', ada: ada('1009.2.9', { min: 300, verify: true }), mi: mi('1109.2.9', { min: 300 }) },
          { id: 'lf-deck', label: 'Clear deck space', field: 'deck', ada: ada('1009.2.2', { expect: true, verify: true }), mi: mi('1109.2.2', { expect: true }) }
        ]
      },
      {
        id: 'pool_slope', label: 'Pool sloped entry', group: 'Recreation',
        fields: [
          { id: 'slope', type: 'slope', label: 'Running slope' },
          { id: 'submerged', type: 'len', label: 'Depth below still water at the bottom' },
          { id: 'handrails', type: 'bool', label: 'Handrails on both sides?' }
        ],
        checks: [
          { id: 'ps-slope', label: 'Running slope (1:12 max)', field: 'slope', ada: ada('1009.3.1 and 405.2', { max: 8.33, verify: true }), mi: mi('1109.3.1 and 405.2', { max: 8.33 }) },
          { id: 'ps-depth', label: 'Submerged depth (24 to 30 in)', field: 'submerged', ada: ada('1009.3.2', { min: 24, max: 30, verify: true }), mi: mi('1109.3.2', { min: 24, max: 30 }) },
          { id: 'ps-rails', label: 'Handrails both sides', field: 'handrails', ada: ada('1009.3.3', { expect: true, verify: true }), mi: mi('1109.3.3', { expect: true }) }
        ]
      },
      {
        id: 'transfer_wall', label: 'Pool or spa transfer wall', group: 'Recreation',
        fields: [
          { id: 'height', type: 'len', label: 'Wall height above the deck' },
          { id: 'depth', type: 'len', label: 'Wall depth (top surface)' },
          { id: 'length', type: 'len', label: 'Wall length' },
          { id: 'grab', type: 'bool', label: 'Grab bar on the wall, perpendicular to the pool wall?' }
        ],
        checks: [
          { id: 'tw-h', label: 'Height (16 to 19 in)', field: 'height', ada: ada('1009.4.2', { min: 16, max: 19, verify: true }), mi: mi('1109.4.2', { min: 16, max: 19 }) },
          { id: 'tw-d', label: 'Depth (12 to 16 in)', field: 'depth', ada: ada('1009.4.3', { min: 12, max: 16, verify: true }), mi: mi('1109.4.3', { min: 12, max: 16 }) },
          { id: 'tw-l', label: 'Length (60 in min)', field: 'length', ada: ada('1009.4.3', { min: 60, verify: true }), mi: mi('1109.4.3', { min: 60 }) },
          { id: 'tw-grab', label: 'Grab bar', field: 'grab', ada: ada('1009.4.5', { expect: true, verify: true }), mi: mi('1109.4.5', { expect: true }) }
        ]
      },
      // ================================================================ Other recreation (ADA 221, 236-239, 1003-1007)
      {
        id: 'assembly', label: 'Bleachers or outdoor assembly seating', group: 'Recreation',
        fields: [
          { id: 'seats', type: 'count', label: 'Total seats' },
          { id: 'wc_spaces', type: 'count', label: 'Wheelchair spaces' },
          { id: 'pairing', type: 'choice', label: 'Space measured', options: [{ id: 'single', label: 'Single space' }, { id: 'pair', label: 'One of two side-by-side spaces' }] },
          { id: 'space_width', type: 'len', label: 'Wheelchair space width' },
          { id: 'entry', type: 'choice', label: 'Entered from', options: [{ id: 'front', label: 'Front or rear' }, { id: 'side', label: 'Side' }] },
          { id: 'space_depth', type: 'len', label: 'Wheelchair space depth' },
          { id: 'companion', type: 'bool', label: 'Companion seat beside each wheelchair space?' }
        ],
        checks: [
          { id: 'as-count', label: 'Number of wheelchair spaces', kind: 'seatCount', fields: ['seats', 'wc_spaces'], ada: ada('221.2.1.1 (Table 221.2.1.1)'), mi: { cite: '2021 MBC §1108.2.2 (Table 1108.2.2.1)', verify: true } },
          { id: 'as-w1', label: 'Width, single space (36 in min)', field: 'space_width', when: { pairing: 'single' }, ada: ada('802.1.2', { min: 36 }), mi: mi('802.3', { min: 36 }) },
          { id: 'as-w2', label: 'Width, each of two spaces (33 in min)', field: 'space_width', when: { pairing: 'pair' }, ada: ada('802.1.2', { min: 33 }), mi: mi('802.3', { min: 33 }) },
          { id: 'as-df', label: 'Depth, front or rear entry (48 in min)', field: 'space_depth', when: { entry: 'front' }, ada: ada('802.1.3', { min: 48 }), mi: mi('802.4', { min: 48 }) },
          { id: 'as-ds', label: 'Depth, side entry (60 in min)', field: 'space_depth', when: { entry: 'side' }, ada: ada('802.1.3', { min: 60 }), mi: mi('802.4', { min: 60 }) },
          { id: 'as-comp', label: 'Companion seats', field: 'companion', ada: ada('221.3 and 802.3', { expect: true }), mi: mi('802.7', { expect: true }) }
        ]
      },
      {
        id: 'fishing', label: 'Fishing pier or platform', group: 'Recreation',
        fields: [
          { id: 'rail_pct', type: 'bool', label: 'At least 25% of railings are 34 in high max, spread along the pier?', allowNA: true },
          { id: 'edge', type: 'len', label: 'Edge protection height where there are no railings', allowNA: true },
          { id: 'cfs', type: 'bool', label: 'Clear floor space at each lowered railing section?' },
          { id: 'turning', type: 'bool', label: 'Turning space on the pier?' }
        ],
        checks: [
          { id: 'fp-rail', label: 'Lowered railings', field: 'rail_pct', ada: ada('1005.2.1', { expect: true }), mi: mi('1105.2.1', { expect: true }) },
          { id: 'fp-edge', label: 'Edge protection (2 in min)', field: 'edge', ada: ada('1005.2.2', { min: 2, verify: true }), mi: mi('1105.2.2', { min: 2 }) },
          { id: 'fp-cfs', label: 'Clear floor space', field: 'cfs', ada: ada('1005.3', { expect: true }), mi: mi('1105.3', { expect: true }) },
          { id: 'fp-turn', label: 'Turning space', field: 'turning', ada: ada('1005.4', { expect: true }), mi: mi('1105.4', { expect: true }) }
        ]
      },
      {
        id: 'boating', label: 'Boat dock, slip or gangway', group: 'Recreation',
        fields: [
          { id: 'gangway_slope', type: 'slope', label: 'Gangway running slope (at typical water level)', allowNA: true },
          { id: 'pier_width', type: 'len', label: 'Clear pier space beside the accessible boat slip' },
          { id: 'route', type: 'bool', label: 'Accessible route to the boat slip?' }
        ],
        checks: [
          { id: 'bt-gang', label: 'Gangway slope (1:12 max, exceptions apply)', field: 'gangway_slope', ada: ada('1003.2.1', { max: 8.33, verify: true }), mi: mi('1103.2.1', { max: 8.33 }),
            note: 'Longer gangways and tidal or changing water levels have exceptions (ADA 1003.2.1 Exceptions); check them before reporting a failure.' },
          { id: 'bt-pier', label: 'Clear pier space width (60 in min)', field: 'pier_width', ada: ada('1003.3.1', { min: 60, verify: true }), mi: mi('1103.3.1', { min: 60 }) },
          { id: 'bt-route', label: 'Accessible route', field: 'route', ada: ada('206.2.14 and 1003.2', { expect: true, verify: true }), mi: mi('1103.2', { expect: true }) }
        ]
      },
      {
        id: 'golf', label: 'Golf course or mini golf', group: 'Recreation',
        fields: [
          { id: 'kind', type: 'choice', label: 'Type', options: [{ id: 'golf', label: 'Golf course or driving range' }, { id: 'mini', label: 'Miniature golf' }] },
          { id: 'car_passage', type: 'len', label: 'Golf car passage width', allowNA: true },
          { id: 'holes', type: 'count', label: 'Mini golf: total holes' },
          { id: 'holes_route', type: 'count', label: 'Mini golf: holes on an accessible route' }
        ],
        checks: [
          { id: 'gf-car', label: 'Golf car passage width (48 in min)', field: 'car_passage', when: { kind: 'golf' }, ada: ada('1006.3.2', { min: 48, verify: true }), mi: mi('1106.3.2', { min: 48 }) },
          { id: 'gf-mini', label: 'At least 50% of mini golf holes on an accessible route', kind: 'ratio', num: 'holes_route', den: 'holes', minPct: 50, when: { kind: 'mini' },
            ada: ada('239.2 and 1007.2'), mi: mi('1107.2') }
        ]
      },
      {
        id: 'exercise', label: 'Exercise equipment or fitness station', group: 'Recreation',
        fields: [
          { id: 'each_type', type: 'bool', label: 'At least one of each type of equipment is on an accessible route?' },
          { id: 'cfs', type: 'bool', label: '30 x 48 in clear floor space at each accessible machine?' }
        ],
        checks: [
          { id: 'ex-type', label: 'One of each type on a route', field: 'each_type', ada: ada('236.1', { expect: true }), mi: { cite: '2021 MBC §1110; ' + MI + ' §1104', expect: true, verify: true } },
          { id: 'ex-cfs', label: 'Clear floor space', field: 'cfs', ada: ada('1004.1', { expect: true }), mi: mi('1104.1', { expect: true }) }
        ]
      },
      {
        id: 'picnic', label: 'Picnic table, bench or outdoor seating', group: 'Recreation',
        fields: [
          { id: 'route', type: 'bool', label: 'On an accessible route?' },
          { id: 'height', type: 'len', label: 'Table surface height', allowNA: true },
          { id: 'knee', type: 'len', label: 'Knee clearance at the wheelchair seating spot', allowNA: true }
        ],
        checks: [
          { id: 'pn-route', label: 'On an accessible route', field: 'route', ada: ada('206.2.2 and 226.1', { expect: true }), mi: mi('902', { expect: true }) },
          { id: 'pn-height', label: 'Table height (28 to 34 in), if treated as a dining surface', field: 'height', ada: ada('226.1 and 902.3', { min: 28, max: 34 }), mi: mi('902.3', { min: 28, max: 34 }) },
          { id: 'pn-knee', label: 'Knee clearance (27 in min), if treated as a dining surface', field: 'knee', ada: ada('902.2 and 306.3', { min: 27 }), mi: mi('902.2 and 306.3', { min: 27 }) },
          { id: 'pn-scope', label: 'Whether picnic tables and outdoor benches are covered at this site', kind: 'manual', ada: ada('226.1'), mi: mi('902'),
            note: 'The 2010 ADA Standards have no picnic-table or park-bench rules; dining-surface rules (5% accessible) are applied here by practice. For park picnic tables under the federal ABA rules, record "Picnic table (park or picnic area)".' }
        ]
      },
      // ================================================================ Outdoor developed areas (ABA Chapter 10)
      // ABA-only checks: required when the visit says federal funds apply, best practice when not.
      {
        id: 'trail', label: 'Trail, nature path or wetland boardwalk', group: 'Trails and parks (ABA)',
        scopeNote: 'Federal ABA rules (Chapter 10). Required for federal agencies and when federal funds apply; otherwise reported as best practice. Use this for trails and boardwalks; use "Outdoor recreation access route" for paths linking parking, picnic, camping and viewing areas.',
        fields: [
          { id: 'surface', type: 'bool', label: 'Tread surface firm and stable?' },
          { id: 'width', type: 'len', label: 'Narrowest clear tread width' },
          { id: 'passing', type: 'bool', label: 'Where narrower than 60 in: 60 x 60 in passing spaces at least every 1,000 ft?', allowNA: true },
          { id: 'obstacle', type: 'len', label: 'Tallest tread obstacle (root, rock, plank edge)', allowNA: true },
          { id: 'opening', type: 'len', label: 'Widest gap in the tread (boardwalk planks, grates)', allowNA: true },
          { id: 'running_slope', type: 'slope', label: 'Steepest running slope' },
          { id: 'steep_length', type: 'count', label: 'Length of that steep segment (feet)' },
          { id: 'pct_12', type: 'bool', label: 'No more than 30% of the trail is steeper than 1:12?' },
          { id: 'cross_slope', type: 'slope', label: 'Steepest cross slope' },
          { id: 'resting', type: 'bool', label: 'Resting intervals (60 in long, nearly level) where needed on steep segments?', allowNA: true },
          { id: 'headroom', type: 'len', label: 'Lowest overhead clearance (branches, signs)', allowNA: true },
          { id: 'sign', type: 'bool', label: 'Trailhead sign gives length, surface, width and steepest slopes?' }
        ],
        checks: [
          { id: 'tr-surf', label: 'Firm and stable surface', field: 'surface', aba: aba('1017.3', { expect: true }) },
          { id: 'tr-width', label: 'Clear tread width (36 in min)', field: 'width', aba: aba('1017.4', { min: 36 }), note: 'May narrow to 32 in where there is a physical constraint.' },
          { id: 'tr-pass', label: 'Passing spaces', field: 'passing', aba: aba('1017.5', { expect: true }) },
          { id: 'tr-obst', label: 'Tread obstacles (2 in max)', field: 'obstacle', aba: aba('1017.6', { max: 2 }), note: 'Up to 3 in is allowed where running and cross slopes are 1:20 or less.' },
          { id: 'tr-open', label: 'Openings (1/2 in max)', field: 'opening', aba: aba('1017.7', { max: 0.5 }) },
          { id: 'tr-run', label: 'Running slope and segment length', kind: 'abaSlope', segments: [[5, Infinity], [8.33, 200], [10, 30], [12.5, 10]], aba: aba('1017.8.1') },
          { id: 'tr-30', label: 'No more than 30% of the trail steeper than 1:12', field: 'pct_12', aba: aba('1017.8.1', { expect: true }) },
          { id: 'tr-cross', label: 'Cross slope (1:20 max)', field: 'cross_slope', aba: aba('1017.8.2', { max: 5 }) },
          { id: 'tr-rest', label: 'Resting intervals', field: 'resting', aba: aba('1017.9', { expect: true }) },
          { id: 'tr-head', label: 'Headroom (80 in min)', field: 'headroom', aba: aba('1017.10', { min: 80 }) },
          { id: 'tr-sign', label: 'Trailhead signs', field: 'sign', aba: aba('1017.11', { expect: true }) }
        ]
      },
      {
        id: 'orar', label: 'Outdoor recreation access route (park path)', group: 'Trails and parks (ABA)',
        scopeNote: 'Federal ABA rules (Chapter 10) for paths that connect parking, picnic, camping, viewing and toilet areas in a park. Required when federal funds apply; otherwise best practice.',
        fields: [
          { id: 'surface', type: 'bool', label: 'Surface firm and stable?' },
          { id: 'width', type: 'len', label: 'Narrowest clear tread width' },
          { id: 'passing', type: 'bool', label: 'Where narrower than 60 in: passing spaces at least every 200 ft?', allowNA: true },
          { id: 'obstacle', type: 'len', label: 'Tallest tread obstacle', allowNA: true },
          { id: 'opening', type: 'len', label: 'Widest gap in the surface', allowNA: true },
          { id: 'running_slope', type: 'slope', label: 'Steepest running slope' },
          { id: 'steep_length', type: 'count', label: 'Length of that steep segment (feet)' },
          { id: 'cross_slope', type: 'slope', label: 'Steepest cross slope' },
          { id: 'resting', type: 'bool', label: 'Resting intervals where needed on steep segments?', allowNA: true },
          { id: 'headroom', type: 'len', label: 'Lowest overhead clearance', allowNA: true }
        ],
        checks: [
          { id: 'or-surf', label: 'Firm and stable surface', field: 'surface', aba: aba('1016.2', { expect: true }) },
          { id: 'or-width', label: 'Clear tread width (36 in min)', field: 'width', aba: aba('1016.3', { min: 36 }) },
          { id: 'or-pass', label: 'Passing spaces', field: 'passing', aba: aba('1016.4', { expect: true }) },
          { id: 'or-obst', label: 'Tread obstacles (1/2 in max)', field: 'obstacle', aba: aba('1016.5', { max: 0.5 }) },
          { id: 'or-open', label: 'Openings (1/2 in max)', field: 'opening', aba: aba('1016.6', { max: 0.5 }) },
          { id: 'or-run', label: 'Running slope and segment length', kind: 'abaSlope', segments: [[5, Infinity], [8.33, 50], [10, 30]], aba: aba('1016.7.1') },
          { id: 'or-cross', label: 'Cross slope (1:33 max)', field: 'cross_slope', aba: aba('1016.7.2', { max: 3.03 }), note: 'Up to 1:20 is allowed on surfaces other than asphalt, concrete and boards where needed for drainage.' },
          { id: 'or-rest', label: 'Resting intervals', field: 'resting', aba: aba('1016.8', { expect: true }) },
          { id: 'or-head', label: 'Headroom (80 in min)', field: 'headroom', aba: aba('1016.9', { min: 80 }) }
        ]
      },
      {
        id: 'beach_route', label: 'Beach access route', group: 'Trails and parks (ABA)',
        scopeNote: 'Federal ABA rules (Chapter 10). Required when federal funds apply; otherwise best practice.',
        fields: [
          { id: 'surface', type: 'bool', label: 'Surface firm and stable (mat, boardwalk or hardened path)?' },
          { id: 'width', type: 'len', label: 'Narrowest clear width' },
          { id: 'running_slope', type: 'slope', label: 'Steepest running slope' },
          { id: 'steep_length', type: 'count', label: 'Length of that steep segment (feet)' },
          { id: 'cross_slope', type: 'slope', label: 'Steepest cross slope' },
          { id: 'obstacle', type: 'len', label: 'Tallest obstacle or mat edge', allowNA: true },
          { id: 'reach_water', type: 'bool', label: 'Route reaches the high tide or normal water level?' }
        ],
        checks: [
          { id: 'br-surf', label: 'Firm and stable surface', field: 'surface', aba: aba('1018.3', { expect: true }) },
          { id: 'br-width', label: 'Clear width (60 in min)', field: 'width', aba: aba('1018.4', { min: 60 }) },
          { id: 'br-run', label: 'Running slope and segment length', kind: 'abaSlope', segments: [[5, Infinity], [8.33, 50], [10, 30]], aba: aba('1018.7.1') },
          { id: 'br-cross', label: 'Cross slope (1:50 max)', field: 'cross_slope', aba: aba('1018.7.2', { max: 2 }) },
          { id: 'br-obst', label: 'Obstacles (1/2 in max)', field: 'obstacle', aba: aba('1018.5', { max: 0.5 }) },
          { id: 'br-water', label: 'Reaches the water', field: 'reach_water', aba: aba('1018.2', { expect: true }) }
        ]
      },
      {
        id: 'picnic_aba', label: 'Picnic table (park or picnic area)', group: 'Trails and parks (ABA)',
        scopeNote: 'Federal ABA rules (Chapter 10). Required when federal funds apply; otherwise best practice. For tables at a building\'s dining area use "Picnic table, bench or outdoor seating".',
        fields: [
          { id: 'tables', type: 'count', label: 'Picnic tables in this area' },
          { id: 'tables_ok', type: 'count', label: 'Tables with a wheelchair space and on an outdoor recreation access route' },
          { id: 'height', type: 'len', label: 'Table top height' },
          { id: 'knee', type: 'len', label: 'Knee clearance height at the wheelchair space' },
          { id: 'knee_depth', type: 'len', label: 'Knee clearance depth under the table' },
          { id: 'cgs', type: 'len', label: 'Clear ground space around the usable sides' },
          { id: 'surface', type: 'bool', label: 'Ground around the table firm and stable, nearly level?' }
        ],
        checks: [
          { id: 'pk-count', label: 'At least 20% of tables accessible', kind: 'ratio', num: 'tables_ok', den: 'tables', minPct: 20, aba: aba('F245.2.1') },
          { id: 'pk-height', label: 'Table top height (28 to 34 in)', field: 'height', aba: aba('1011.3.1', { min: 28, max: 34 }) },
          { id: 'pk-knee', label: 'Knee clearance height (27 in min)', field: 'knee', aba: aba('1011.3.2', { min: 27 }) },
          { id: 'pk-kdepth', label: 'Knee clearance depth (19 in min)', field: 'knee_depth', aba: aba('1011.3.2', { min: 19 }) },
          { id: 'pk-cgs', label: 'Clear ground space around usable sides (36 in min)', field: 'cgs', aba: aba('1011.3.3', { min: 36 }) },
          { id: 'pk-surf', label: 'Ground surface', field: 'surface', aba: aba('1011.2', { expect: true }) }
        ]
      },
      {
        id: 'fire_grill', label: 'Fire ring, grill or cooking surface', group: 'Trails and parks (ABA)',
        scopeNote: 'Federal ABA rules (Chapter 10). Required when federal funds apply; otherwise best practice.',
        fields: [
          { id: 'height', type: 'len', label: 'Cooking surface height' },
          { id: 'cgs', type: 'bool', label: 'Clear, firm and nearly level ground space around it (48 x 48 in at fire rings, 30 x 48 in at grills)?' },
          { id: 'route', type: 'bool', label: 'On an outdoor recreation access route?' }
        ],
        checks: [
          { id: 'fg-height', label: 'Cooking surface height (15 to 34 in)', field: 'height', aba: aba('1011.5 and 1011.6', { min: 15, max: 34 }) },
          { id: 'fg-cgs', label: 'Clear ground space', field: 'cgs', aba: aba('1011.5 and 1011.6', { expect: true }) },
          { id: 'fg-route', label: 'On an access route', field: 'route', aba: aba('F247.1', { expect: true }) }
        ]
      },
      {
        id: 'bench_aba', label: 'Park bench', group: 'Trails and parks (ABA)',
        scopeNote: 'Federal ABA rules (Chapter 10). Required when federal funds apply; otherwise best practice.',
        fields: [
          { id: 'seat', type: 'len', label: 'Seat height' },
          { id: 'back', type: 'bool', label: 'Back support provided?' },
          { id: 'cgs', type: 'bool', label: '36 x 48 in clear ground space beside one end?' }
        ],
        checks: [
          { id: 'bn-seat', label: 'Seat height (17 to 19 in)', field: 'seat', aba: aba('1011.13', { min: 17, max: 19 }) },
          { id: 'bn-back', label: 'Back support', field: 'back', aba: aba('1011.13', { expect: true }) },
          { id: 'bn-cgs', label: 'Clear ground space beside the bench', field: 'cgs', aba: aba('1011.13', { expect: true }) }
        ]
      },
      {
        id: 'campsite', label: 'Campsite or tent pad', group: 'Trails and parks (ABA)',
        scopeNote: 'Federal ABA rules (Chapter 10). Required when federal funds apply; otherwise best practice.',
        fields: [
          { id: 'surface', type: 'bool', label: 'Tent pad surface firm and stable (allows tent stakes)?' },
          { id: 'slope', type: 'slope', label: 'Steepest slope on the tent pad' },
          { id: 'cgs', type: 'len', label: 'Clear ground space around the tent pad' },
          { id: 'route', type: 'bool', label: 'Connected to parking, toilets and water by an outdoor recreation access route?' }
        ],
        checks: [
          { id: 'cs-surf', label: 'Firm and stable tent pad', field: 'surface', aba: aba('1013.2', { expect: true }) },
          { id: 'cs-slope', label: 'Tent pad slope (1:48 max)', field: 'slope', aba: aba('1013.3', { max: 2.08 }), note: '1:33 is allowed on surfaces other than asphalt, concrete and boards where needed for drainage.' },
          { id: 'cs-cgs', label: 'Clear ground space around the pad (48 in min)', field: 'cgs', aba: aba('1013.4', { min: 48 }) },
          { id: 'cs-route', label: 'On an access route', field: 'route', aba: aba('F244', { expect: true }) }
        ]
      },
      {
        id: 'viewing', label: 'Overlook, viewing area or viewing scope', group: 'Trails and parks (ABA)',
        scopeNote: 'Federal ABA rules (Chapter 10). Required when federal funds apply; otherwise best practice.',
        fields: [
          { id: 'cgs', type: 'bool', label: '30 x 48 in clear ground space at each distinct viewing spot?' },
          { id: 'view_height', type: 'len', label: 'Railing or wall height in front of the seated view', allowNA: true },
          { id: 'scope', type: 'len', label: 'Viewing scope eyepiece height', allowNA: true },
          { id: 'route', type: 'bool', label: 'On an outdoor recreation access route?' }
        ],
        checks: [
          { id: 'vw-cgs', label: 'Clear ground space at viewing spots', field: 'cgs', aba: aba('1011.14', { expect: true }) },
          { id: 'vw-view', label: 'Clear view at seated eye level', field: 'view_height', kind: 'manual', aba: aba('1011.14'), note: 'Check that a seated person can see over or through the railing (about 32 in and above).' },
          { id: 'vw-scope', label: 'Viewing scope eyepiece (43 to 51 in)', field: 'scope', aba: aba('1011.15', { min: 43, max: 51 }) },
          { id: 'vw-route', label: 'On an access route', field: 'route', aba: aba('F246', { expect: true }) }
        ]
      },
      // ================================================================ Polling places (DOJ ADA Checklist for Polling Places, 2016)
      {
        id: 'voting_station', label: 'Accessible voting station or booth', group: 'Polling place',
        fields: [
          { id: 'route_width', type: 'len', label: 'Narrowest route to the station (between tables, lines, booths)' },
          { id: 'cfs', type: 'bool', label: '30 x 48 in clear floor space at the station?' },
          { id: 'height', type: 'len', label: 'Writing or machine surface height', allowNA: true },
          { id: 'knee', type: 'len', label: 'Knee clearance height', allowNA: true },
          { id: 'reach_high', type: 'len', label: 'Highest control or ballot slot' },
          { id: 'machine', type: 'bool', label: 'Accessible voting machine set up, powered on, with audio and tactile controls?' },
          { id: 'privacy', type: 'bool', label: 'Positioned so the voter has privacy?' }
        ],
        checks: [
          { id: 'vs-route', label: 'Route to the station (36 in min)', field: 'route_width', ada: ada('403.5.1', { min: 36 }), mi: mi('403.5.1', { min: 36 }) },
          { id: 'vs-cfs', label: 'Clear floor space', field: 'cfs', ada: ada('305.3', { expect: true }), mi: mi('305.3', { expect: true }) },
          { id: 'vs-height', label: 'Surface height (28 to 34 in)', field: 'height', ada: ada('902.3', { min: 28, max: 34 }), mi: mi('902.3', { min: 28, max: 34 }) },
          { id: 'vs-knee', label: 'Knee clearance (27 in min)', field: 'knee', ada: ada('306.3', { min: 27 }), mi: mi('306.3', { min: 27 }) },
          { id: 'vs-reach', label: 'Controls within reach (48 in max)', field: 'reach_high', ada: ada('308.2.1 and 308.3.1', { max: 48 }), mi: mi('308.2.1 and 308.3.1', { max: 48 }) },
          { id: 'vs-machine', label: 'Accessible voting system available', field: 'machine', ada: { cite: 'Help America Vote Act, 52 U.S.C. §21081(a)(3)', expect: true, verify: true }, mi: { cite: 'MCL 168.795a', expect: true, verify: true } },
          { id: 'vs-priv', label: 'Private and independent voting', field: 'privacy', ada: { cite: 'Help America Vote Act, 52 U.S.C. §21081(a)(3)(A); DOJ ADA Checklist for Polling Places', expect: true, verify: true } }
        ]
      },
      {
        id: 'temp_fix', label: 'Temporary fix (cones, mat, portable ramp, propped door, bell)', group: 'Polling place',
        scopeNote: 'The DOJ ADA Checklist for Polling Places lists temporary measures that can make a site usable on election day. They must be in place before the polls open and stay in place all day.',
        fields: [
          { id: 'kind', type: 'choice', label: 'What is it?', options: [{ id: 'parking', label: 'Cones or signs for temporary accessible parking' }, { id: 'mat', label: 'Mat or plates over grass, gravel or gaps' }, { id: 'ramp', label: 'Portable ramp or threshold ramp' }, { id: 'door', label: 'Door propped open or staffed, or a call bell' }, { id: 'other', label: 'Other' }] },
          { id: 'in_place', type: 'bool', label: 'In place before the polls open, and staff know to keep it there?' },
          { id: 'secure', type: 'bool', label: 'Secured, with no loose or curled edges?' },
          { id: 'edge', type: 'len', label: 'Height of the mat or ramp edge', allowNA: true },
          { id: 'slope', type: 'slope', label: 'Portable ramp running slope', allowNA: true },
          { id: 'width', type: 'len', label: 'Clear width of mat or ramp', allowNA: true }
        ],
        checks: [
          { id: 'tf-place', label: 'In place all day', field: 'in_place', ada: { cite: 'DOJ ADA Checklist for Polling Places (2016)', expect: true } },
          { id: 'tf-secure', label: 'Secured, no tripping edges', field: 'secure', ada: ada('302.1', { expect: true }) },
          { id: 'tf-edge', label: 'Edge height (1/2 in max, beveled)', field: 'edge', ada: ada('303.3', { max: 0.5 }), mi: mi('303.3', { max: 0.5 }) },
          { id: 'tf-slope', label: 'Portable ramp slope (1:12 max)', field: 'slope', when: { kind: 'ramp' }, ada: ada('405.2', { max: 8.33 }), mi: mi('405.2', { max: 8.33 }) },
          { id: 'tf-width', label: 'Clear width (36 in min)', field: 'width', ada: ada('403.5.1', { min: 36 }), mi: mi('403.5.1', { min: 36 }) }
        ]
      },
      // ================================================================ Festivals and temporary events
      {
        id: 'event_tent', label: 'Tent, booth or vendor space', group: 'Festivals and events',
        scopeNote: 'The ADA applies to temporary facilities (ADA 201.3). Michigan building code applies to tents and other temporary structures that need a permit.',
        fields: [
          { id: 'level_change', type: 'len', label: 'Change in level at the tent edge or floor', allowNA: true },
          { id: 'beveled', type: 'bool', label: 'Is that change in level beveled or ramped?' },
          { id: 'entry_width', type: 'len', label: 'Clear width at the entry' },
          { id: 'aisle', type: 'len', label: 'Narrowest aisle inside' },
          { id: 'turning', type: 'bool', label: '60 in turning circle or T-shaped space inside?' },
          { id: 'floor', type: 'bool', label: 'Floor firm, stable and slip resistant (not loose grass, straw, sand or gravel)?' },
          { id: 'counter', type: 'len', label: 'Lowest counter or table where people are served', allowNA: true },
          { id: 'reach_high', type: 'len', label: 'Highest item, sign-up sheet or control people need to reach' },
          { id: 'reach_low', type: 'len', label: 'Lowest item people need to reach', allowNA: true }
        ],
        checks: [
          { id: 'et-level', label: 'Change in level at the entry', kind: 'levelChange', fields: ['level_change', 'beveled'], ada: ada('303.2 and 303.3'), mi: mi('303.2 and 303.3') },
          { id: 'et-entry', label: 'Entry width (32 in min at openings)', field: 'entry_width', ada: ada('404.2.3', { min: 32 }), mi: mi('404.2.3', { min: 32 }) },
          { id: 'et-aisle', label: 'Aisle width (36 in min)', field: 'aisle', ada: ada('403.5.1', { min: 36 }), mi: mi('403.5.1', { min: 36 }) },
          { id: 'et-turn', label: 'Turning space', field: 'turning', ada: ada('304.3', { expect: true }), mi: mi('304.3', { expect: true }) },
          { id: 'et-floor', label: 'Floor surface', field: 'floor', ada: ada('302.1', { expect: true }), mi: mi('302.1', { expect: true }) },
          { id: 'et-counter', label: 'Service counter or table (36 in max)', field: 'counter', ada: ada('904.4.1', { max: 36 }), mi: mi('904.3.1', { max: 36 }) },
          { id: 'et-high', label: 'High reach (48 in max)', field: 'reach_high', ada: ada('308.2.1 and 308.3.1', { max: 48 }), mi: mi('308.2.1 and 308.3.1', { max: 48 }) },
          { id: 'et-low', label: 'Low reach (15 in min)', field: 'reach_low', ada: ada('308.2.1 and 308.3.1', { min: 15 }), mi: mi('308.2.1 and 308.3.1', { min: 15 }) }
        ]
      },
      {
        id: 'event_path', label: 'Event path, ground cover or cable cover', group: 'Festivals and events',
        fields: [
          { id: 'surface', type: 'bool', label: 'Path firm, stable and slip resistant (mats, plywood, pavement)?' },
          { id: 'clear_width', type: 'len', label: 'Narrowest clear width (crowds, vendor displays, cords)' },
          { id: 'running_slope', type: 'slope', label: 'Steepest running slope' },
          { id: 'cross_slope', type: 'slope', label: 'Steepest cross slope' },
          { id: 'level_change', type: 'len', label: 'Tallest cable cover, mat edge or bump', allowNA: true },
          { id: 'beveled', type: 'bool', label: 'Is it beveled or ramped on both sides?' },
          { id: 'opening', type: 'len', label: 'Widest gap between mats or plates', allowNA: true }
        ],
        checks: [
          { id: 'ep-surf', label: 'Firm, stable path', field: 'surface', ada: ada('302.1', { expect: true }), mi: mi('302.1', { expect: true }) },
          { id: 'ep-width', label: 'Clear width (36 in min)', field: 'clear_width', ada: ada('403.5.1', { min: 36 }), mi: mi('403.5.1', { min: 36 }) },
          { id: 'ep-run', label: 'Running slope (1:20 max; steeper needs a ramp)', field: 'running_slope', ada: ada('403.3', { max: 5 }), mi: mi('403.3', { max: 5 }) },
          { id: 'ep-cross', label: 'Cross slope (1:48 max)', field: 'cross_slope', ada: ada('403.3', { max: 2.08 }), mi: mi('403.3', { max: 2.08 }) },
          { id: 'ep-level', label: 'Cable covers and edges', kind: 'levelChange', fields: ['level_change', 'beveled'], ada: ada('303.2, 303.3 and 303.4'), mi: mi('303.2, 303.3 and 303.4'),
            note: 'Cable covers over 1/2 in high must have ramped sides (1:12 max).' },
          { id: 'ep-open', label: 'Gaps (1/2 in max)', field: 'opening', ada: ada('302.3', { max: 0.5 }), mi: mi('302.3', { max: 0.5 }) }
        ]
      },
      {
        id: 'portable_toilet', label: 'Portable toilets', group: 'Festivals and events',
        fields: [
          { id: 'total', type: 'count', label: 'Portable toilet units in this cluster' },
          { id: 'accessible', type: 'count', label: 'Accessible units' },
          { id: 'route', type: 'bool', label: 'Accessible units on a firm, stable route?' },
          { id: 'level_change', type: 'len', label: 'Step or lip at the accessible unit door', allowNA: true },
          { id: 'beveled', type: 'bool', label: 'Is that lip beveled or ramped?' },
          { id: 'door', type: 'len', label: 'Door clear width' },
          { id: 'turning', type: 'bool', label: '60 in turning space inside?' },
          { id: 'seat', type: 'len', label: 'Toilet seat height' },
          { id: 'grab', type: 'bool', label: 'Grab bars on the side and back walls?' }
        ],
        checks: [
          { id: 'pt-count', label: 'At least 5% accessible (at least one)', kind: 'ratio', num: 'accessible', den: 'total', minPct: 5, ada: ada('213.2'), mi: { cite: '2021 MBC §1109.2', verify: true } },
          { id: 'pt-route', label: 'On an accessible route', field: 'route', ada: ada('206.2.2 and 302.1', { expect: true }), mi: mi('302.1', { expect: true }) },
          { id: 'pt-level', label: 'Level entry', kind: 'levelChange', fields: ['level_change', 'beveled'], ada: ada('303.2 and 303.3'), mi: mi('303.2 and 303.3') },
          { id: 'pt-door', label: 'Door clear width (32 in min)', field: 'door', ada: ada('404.2.3', { min: 32 }), mi: mi('404.2.3', { min: 32 }) },
          { id: 'pt-turn', label: 'Turning space inside', field: 'turning', ada: ada('603.2.1', { expect: true }), mi: mi('603.2.1', { expect: true }) },
          { id: 'pt-seat', label: 'Seat height (17 to 19 in)', field: 'seat', ada: ada('604.4', { min: 17, max: 19 }), mi: mi('604.4', { min: 17, max: 19 }) },
          { id: 'pt-grab', label: 'Grab bars', field: 'grab', ada: ada('604.5', { expect: true }), mi: mi('604.5', { expect: true }) }
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
