/* DNEM ADA Access Lens - rules table
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
  // Section numbers and limits confirmed against the 2010 ADA Standards text, Oct 27, 2026.
  function ada(sec, lim) { var o = Object.assign({ cite: 'ADA 2010 §' + sec }, lim || {}); delete o.verify; return o; }
  // Federal Architectural Barriers Act standards, outdoor developed areas (Chapter 10).
  // Section numbers and limits confirmed against the ABA Chapter 10 text, Oct 27, 2026.
  function aba(sec, lim) { return Object.assign({ cite: 'ABA §' + sec }, lim || {}); }
  // Recommendations and safety rules that are not ADA, ABA or Michigan barrier-free requirements.
  // An unmet item is reported as "Best practice not met", never as "Does not comply".
  function bp(cite, lim) { return Object.assign({ cite: cite, verify: true }, lim || {}); }
  var EV_BP = 'US Access Board, Design Recommendations for Accessible Electric Vehicle Charging Stations (2023)';
  var LIGHT_BP = 'Best practice (no ADA or Michigan accessibility rule for exterior lighting)';
  var PLAY_SAFE = 'CPSC Public Playground Safety Handbook, adopted by Michigan\'s Playground Equipment Safety Act (1997 PA 16)';
  function mi(sec, lim, opts) {
    return Object.assign({ cite: MI + ' §' + sec, verify: true }, lim || {}, opts || {});
  }

  var RULES = {
    version: '2026-10-27.9',
    codes: {
      ada: { short: 'ADA 2010', name: 'ADA Accessibility Guidelines (2010 ADA Standards for Accessible Design)' },
      aba: { short: 'ABA', name: 'ADA and ABA Accessibility Guidelines, Chapter 10: outdoor developed areas (Architectural Barriers Act scoping)' },
      bp: { short: 'Best practice', name: 'Recommendations and safety rules that are not accessibility requirements (US Access Board EV charging recommendations, exterior lighting practice, Michigan Playground Equipment Safety Act)' },
      mi: {
        short: 'Michigan',
        name: '2021 Michigan Building Code, Chapter 11 (adopts ICC A117.1-2017), effective April 9, 2025',
        note: 'Michigan Administrative Code R 408.30427 adopts ICC A117.1 except sections 611 and 707.'
      }
    },
    federalFunds: [
      { id: 'yes', label: 'Yes: federal agency, or federal money that requires the ADA and ABA Accessibility Guidelines, Chapter 10 (for example a federal grant to DNR)' },
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
            ada: ada('208.2 (Table 208.2)'), mi: { cite: '2021 MBC §1106.2 (Table 1106.2)', verify: true },
            note: 'Hospital outpatient (10%) and rehabilitation/outpatient PT (20%) facilities have higher counts (ADA 208.2.1, 208.2.2).'
          },
          {
            id: 'lot-van', label: 'Number of van-accessible spaces (1 per 6 accessible, or fraction)', kind: 'vanCount', fields: ['accessible', 'van'],
            ada: ada('208.2.4'), mi: { cite: '2021 MBC §1106.6', verify: true }
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
            ada: ada('502.3.1', { min: 60 }), mi: mi('502.4.2', { min: 60 }) },
          { id: 'pk-van', label: 'Van space and aisle: 132 in space with 60 in aisle, or 96 in space with 96 in aisle', kind: 'vanDims',
            fields: ['space_width', 'aisle_width'], when: { van: true },
            ada: ada('502.2 and Exception'), mi: mi('502.2 and 502.4.2') },
          { id: 'pk-slope', label: 'Space and aisle slope (1:48 max)', field: 'slope',
            ada: ada('502.4', { max: 2.08 }), mi: mi('502.5', { max: 2.08 }) },
          { id: 'pk-marked', label: 'Access aisle marked', field: 'aisle_marked',
            ada: ada('502.3.3', { expect: true }), mi: mi('502.4.4', { expect: true }) },
          { id: 'pk-route', label: 'Access aisle adjoins accessible route', field: 'aisle_route',
            ada: ada('502.3', { expect: true }), mi: mi('502.4.1', { expect: true }) },
          { id: 'pk-sign', label: 'Accessible parking sign provided', field: 'sign_present',
            ada: ada('216.5 and 502.6', { expect: true }), mi: { cite: '2021 MBC §1112.1, item 1; ' + MI + ' §502.7', expect: true, verify: true },
            note: 'Michigan: lots with four or fewer spaces in total need not identify the accessible space (MBC 1112.1, item 1, Exception).' },
          { id: 'pk-sign-ht', label: 'Sign height to bottom of sign', field: 'sign_height',
            ada: ada('502.6', { min: 60 }), mi: mi('502.7', { min: 60 }) },
          { id: 'pk-van-sign', label: '"Van accessible" designation', field: 'van_sign', when: { van: true },
            ada: ada('502.6', { expect: true }), mi: mi('502.7', { expect: true }) },
          { id: 'pk-van-clr', label: 'Van vertical clearance', field: 'van_clearance', when: { van: true },
            ada: ada('502.5', { min: 98 }), mi: mi('502.6', { min: 98 }) }
        ]
      },
      // ---------------------------------------------------------------- Routes
      {
        id: 'route', label: 'Accessible route / walkway', group: 'Routes',
        fields: [
          { id: 'running_slope', type: 'slope', label: 'Running slope (direction of travel)' },
          { id: 'cross_slope', type: 'slope', label: 'Cross slope' },
          { id: 'clear_width', type: 'len', label: 'Clear width' },
          { id: 'setting', type: 'choice', label: 'Route location', options: [ { id: 'outdoor', label: 'Outdoors' }, { id: 'indoor', label: 'Indoors, or an outdoor route within a seating area' } ] },
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
            ada: ada('403.5.1', { min: 36 }),
            note: 'May narrow to 32 in for 24 in max length at intervals of 48 in min.' },
          { id: 'rt-width-mi-out', label: 'Clear width, outdoor route (Michigan 48 in min)', field: 'clear_width', when: { setting: 'outdoor' },
            mi: mi('403.5.1', { min: 48 }), note: 'A117.1-2017 requires 48 in for exterior routes; 36 in within seating areas. Exterior ramps follow 405.5.' },
          { id: 'rt-width-mi-in', label: 'Clear width, indoor route (Michigan 36 in min)', field: 'clear_width', when: { setting: 'indoor' },
            mi: mi('403.5.1', { min: 36 }), note: 'May narrow to 32 in for 24 in max length; the wider segments between must be 52 in long in new buildings, 48 in in existing.' },
          { id: 'rt-level', label: 'Change in level (1/4 in vertical, or 1/2 in beveled)', kind: 'levelChange',
            fields: ['level_change', 'beveled'], ada: ada('303.2 and 303.3'), mi: mi('303.2 and 303.3') },
          { id: 'rt-open', label: 'Openings in floor or ground (1/2 in sphere)', field: 'opening',
            ada: ada('302.3', { max: 0.5 }), mi: mi('302.3', { max: 0.5 }) },
          { id: 'rt-surface', label: 'Surface firm, stable, slip resistant', field: 'surface',
            ada: ada('302.1', { expect: true }), mi: mi('302.1', { expect: true }) }
        ]
      },
      {
        id: 'surface', label: 'Ground or floor surface (pavement, gravel, carpet, mats)', group: 'Routes',
        scopeNote: 'Use this for the walking surface itself: parking lots, sidewalks, entrance platforms and landings, and the path of travel indoors and out. Record each problem spot separately, with a photo.',
        fields: [
          { id: 'where', type: 'choice', label: 'Where', options: [
            { id: 'parking', label: 'Parking lot or access aisle' },
            { id: 'sidewalk', label: 'Sidewalk or outdoor walkway' },
            { id: 'entrance', label: 'Entrance platform or landing' },
            { id: 'interior', label: 'Indoor path of travel' },
            { id: 'other', label: 'Somewhere else' }] },
          { id: 'material', type: 'choice', label: 'Surface', options: [
            { id: 'asphalt', label: 'Asphalt' },
            { id: 'concrete', label: 'Concrete' },
            { id: 'pavers', label: 'Pavers or brick' },
            { id: 'gravel', label: 'Gravel, loose stone or wood chips' },
            { id: 'grass', label: 'Grass or dirt' },
            { id: 'carpet', label: 'Carpet or carpet tile' },
            { id: 'mat', label: 'Entrance mat or rug' },
            { id: 'hard_floor', label: 'Tile, wood, vinyl or other hard floor' }] },
          { id: 'firm', type: 'bool', label: 'Firm, stable and slip resistant (no loose gravel, sand, mud or wet slick spots)?' },
          { id: 'damage', type: 'bool', label: 'Free of potholes, broken or heaved pavement and crumbling edges?' },
          { id: 'opening', type: 'len', label: 'Widest crack, gap or hole in the path of travel', allowNA: true },
          { id: 'level_change', type: 'len', label: 'Largest change in level (heaved slab, pothole edge, mat or carpet edge)', allowNA: true },
          { id: 'beveled', type: 'bool', label: 'Is that change in level beveled (1:2 max)?' },
          { id: 'pile', type: 'len', label: 'Carpet or mat pile height (to the backing)' },
          { id: 'secure', type: 'bool', label: 'Carpet or mat securely attached, flat, with no loose, curled or worn-through spots?' },
          { id: 'backing', type: 'bool', label: 'Firm pad or backing, or none (no thick, spongy cushion)?' },
          { id: 'edge_trim', type: 'bool', label: 'Exposed edges fastened down with trim along the whole edge?', allowNA: true }
        ],
        checks: [
          { id: 'sf-firm', label: 'Firm, stable, slip resistant', field: 'firm', ada: ada('302.1', { expect: true }), mi: mi('302.1', { expect: true }),
            note: 'Loose gravel, sand, wood chips and grass are generally not firm and stable unless stabilized.' },
          { id: 'sf-damage', label: 'No potholes or broken pavement', field: 'damage', ada: ada('302.1 and 303', { expect: true }), mi: mi('302.1 and 303', { expect: true }),
            note: 'Accessible features must be kept in working order (28 CFR 35.133 and 36.211).' },
          { id: 'sf-open', label: 'Openings: cracks and gaps (1/2 in sphere)', field: 'opening', ada: ada('302.3', { max: 0.5 }), mi: mi('302.3', { max: 0.5 }),
            note: 'Elongated openings must also run perpendicular to the main direction of travel.' },
          { id: 'sf-level', label: 'Change in level (1/4 in vertical, or 1/2 in beveled)', kind: 'levelChange', fields: ['level_change', 'beveled'],
            ada: ada('303.2 and 303.3'), mi: mi('303.2 and 303.3') },
          { id: 'sf-pile', label: 'Carpet or mat pile height (1/2 in max)', field: 'pile', when: { material: ['carpet', 'mat'] }, ada: ada('302.2', { max: 0.5 }), mi: mi('302.2', { max: 0.5 }) },
          { id: 'sf-secure', label: 'Carpet or mat securely attached', field: 'secure', when: { material: ['carpet', 'mat'] }, ada: ada('302.2', { expect: true }), mi: mi('302.2', { expect: true }),
            note: 'Loose, curled or worn mats are a common trip hazard. Fixing them is usually a maintenance item.' },
          { id: 'sf-backing', label: 'Firm cushion, pad or backing, or none', field: 'backing', when: { material: ['carpet', 'mat'] }, ada: ada('302.2', { expect: true }), mi: mi('302.2', { expect: true }) },
          { id: 'sf-edge', label: 'Exposed edges fastened with trim', field: 'edge_trim', when: { material: ['carpet', 'mat'] }, ada: ada('302.2', { expect: true }), mi: mi('302.2', { expect: true }) }
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
          { id: 'st-rails', label: 'Handrails both sides', field: 'handrails', ada: ada('504.6 and 505.2', { expect: true }), mi: mi('504.7 and 505.2', { expect: true }) },
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
          { id: 'threshold', type: 'len', label: 'Threshold height (highest point above the floor or landing)', allowNA: true },
          { id: 'threshold_beveled', type: 'bool', label: 'Is the threshold beveled (1:2 max) on each side?' },
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
          { id: 'dr-width', label: 'Clear opening width', field: 'clear_width', ada: ada('404.2.3', { min: 32 }), mi: mi('404.2.2', { min: 32 }) },
          { id: 'dr-thresh', label: 'Threshold height and bevel (1/4 in vertical, or 1/2 in beveled 1:2)', kind: 'levelChange', fields: ['threshold', 'threshold_beveled'], existingMax: 0.75,
            ada: ada('404.2.5, 302 and 303'), mi: mi('404.2.4, 302 and 303'),
            note: 'Existing or altered thresholds may be 3/4 in high max if beveled 1:2 on each face (ADA 404.2.5 Exception).' },
          { id: 'dr-hw-ht', label: 'Hardware height', field: 'hw_height', ada: ada('404.2.7', { min: 34, max: 48 }), mi: mi('404.2.6.1', { min: 34, max: 48 }) },
          { id: 'dr-hw-type', label: 'Hardware operable without tight grasping', field: 'hw_grasp', ada: ada('404.2.7 and 309.4', { expect: true }), mi: mi('404.2.6 and 309.4', { expect: true }) },
          { id: 'dr-force', label: 'Opening force, interior hinged door (5 lbf max)', field: 'force', when: { exterior: false, fire_door: false },
            ada: ada('404.2.9', { max: 5 }), mi: mi('404.2.8', { max: 5 }),
            note: 'Fire doors: minimum force allowed by the authority having jurisdiction. Exterior doors: no maximum set.' },
          { id: 'dr-close', label: 'Door closer speed (5 seconds min, 90° to 12°)', field: 'close_time', ada: ada('404.2.8.1', { min: 5 }), mi: mi('404.2.7.1', { min: 5 }) },
          { id: 'dr-pull-latch', label: 'Pull side: latch-side clearance', field: 'latch_clear', when: { approach: 'front_pull' },
            ada: ada('404.2.4.1 (Table 404.2.4.1)', { min: 18 }), mi: mi('404.2.3.2 (Table 404.2.3.2)', { min: 18 }) },
          { id: 'dr-pull-depth', label: 'Pull side: maneuvering depth', field: 'maneuver_depth', when: { approach: 'front_pull' },
            ada: ada('404.2.4.1 (Table 404.2.4.1)', { min: 60 }), mi: mi('404.2.3.2 (Table 404.2.3.2)', { min: 60 }) },
          { id: 'dr-push-depth', label: 'Push side: maneuvering depth', field: 'maneuver_depth', when: { approach: 'front_push' },
            ada: ada('404.2.4.1 (Table 404.2.4.1)', { min: 48 }), mi: mi('404.2.3.2 (Table 404.2.3.2)', { min: 52 }, { newBuilding: true, elseMin: 48 }),
            note: 'Add 12 in latch-side clearance when the door has both a closer and a latch. Michigan: 52 in for new buildings, 48 in for existing.' },
          { id: 'dr-other', label: 'Maneuvering clearance (hinge side, latch side or sliding)', kind: 'manual', when: { approach: 'other' },
            ada: ada('404.2.4.1 (Table 404.2.4.1)'), mi: mi('404.2.3.2 and 404.2.3.3 (Tables 404.2.3.2 and 404.2.3.3)'),
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
          { id: 'wc-clr-d', label: 'Clearance depth', field: 'clear_depth', ada: ada('604.3.1', { min: 56 }), mi: mi('604.3.2', { min: 56 }) },
          { id: 'wc-sgb-len', label: 'Side grab bar length', field: 'side_gb_len', ada: ada('604.5.1', { min: 42 }), mi: mi('604.5.1.1', { min: 42 }),
            note: 'A117.1-2017 (604.5.1.2) also requires a vertical side grab bar, 18 in long, bottom at 39 to 41 in high and 39 to 41 in from the rear wall.' },
          { id: 'wc-sgb-rear', label: 'Side grab bar distance from rear wall', field: 'side_gb_rear', ada: ada('604.5.1', { max: 12 }), mi: mi('604.5.1.1', { max: 12 }) },
          { id: 'wc-sgb-reach', label: 'Side grab bar extends from rear wall', field: 'side_gb_reach', ada: ada('604.5.1', { min: 54 }), mi: mi('604.5.1.1', { min: 54 }) },
          { id: 'wc-rgb-len', label: 'Rear grab bar length', field: 'rear_gb_len', ada: ada('604.5.2', { min: 36 }), mi: mi('604.5.2', { min: 36 }) },
          { id: 'wc-rgb-split', label: 'Rear grab bar position', field: 'rear_gb_split', ada: ada('604.5.2', { expect: true }), mi: mi('604.5.2', { expect: true }),
            note: 'ADA: 12 in on one side of the toilet centerline and 24 in on the other. A117.1-2017: 6 in max from the side wall, extending 42 in min from the side wall.' },
          { id: 'wc-gb-ht', label: 'Grab bar height', field: 'gb_height', ada: ada('609.4', { min: 33, max: 36 }), mi: mi('609.4.1', { min: 33, max: 36 }) },
          { id: 'wc-tp-front', label: 'Paper dispenser location (7 to 9 in in front of toilet)', field: 'tp_front', ada: ada('604.7', { min: 7, max: 9 }), mi: mi('604.7.1, Exception', { min: 7, max: 9 }),
            note: 'Under A117.1-2017 the 7 to 9 in location applies to dispensers holding up to two 5 in rolls. Larger dispensers go 24 to 36 in from the rear wall above the grab bar, or 24 to 42 in below it, with the outlet 18 to 48 in high (604.7.1).' },
          { id: 'wc-tp-ht', label: 'Paper dispenser outlet height', field: 'tp_outlet', ada: ada('604.7', { min: 15, max: 48 }), mi: mi('604.7.1, Exception', { min: 15, max: 48 }) },
          { id: 'wc-flush', label: 'Flush control location', field: 'flush_open', ada: ada('604.6', { expect: true }), mi: mi('604.6', { expect: true }) },
          { id: 'wc-stall-w', label: 'Wheelchair stall width', field: 'stall_width', when: { stall: true },
            ada: ada('604.8.1.1', { min: 60 }), mi: mi('604.9.2.1', { min: 60 }) },
          { id: 'wc-stall-d-wall', label: 'Wheelchair stall depth (wall-hung toilet)', field: 'stall_depth', when: { stall: true, mount: 'wall' },
            ada: ada('604.8.1.1', { min: 56 }), mi: mi('604.9.2.1', { min: 56 }) },
          { id: 'wc-stall-d-floor', label: 'Wheelchair stall depth (floor-mounted toilet)', field: 'stall_depth', when: { stall: true, mount: 'floor' },
            ada: ada('604.8.1.1', { min: 59 }), mi: mi('604.9.2.1', { min: 59 }) }
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
            ada: ada('304.3.1', { min: 60 }), mi: mi('304.3.1.1 and 304.3.1.2', { min: 67 }, { newBuilding: true, elseMin: 60 }),
            note: 'A117.1-2017 raised the circle to 67 in for new buildings; existing buildings keep 60 in.' },
          { id: 'tr-turn-t', label: 'Turning space (T-shaped)', kind: 'manual', when: { turn_shape: 't' },
            ada: ada('304.3.2'), mi: mi('304.3.2.1 and 304.3.2.2'), note: 'Check the T dimensions against the photos; A117.1-2017 enlarged the T for new buildings.' },
          { id: 'tr-swing', label: 'Door does not swing into fixture clear floor space', field: 'door_swing',
            ada: ada('603.2.3', { expect: false }), mi: mi('603.2.2', { expect: false }),
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
          { id: 'lv-knee', label: 'Knee clearance height', field: 'knee', ada: ada('606.2 and 306.3.1', { min: 27 }), mi: mi('306.3.1', { min: 27 }) },
          { id: 'lv-pipes', label: 'Exposed pipes protected', field: 'pipes', ada: ada('606.5', { expect: true }), mi: mi('606.6', { expect: true }) },
          { id: 'lv-faucet', label: 'Faucet operable parts', field: 'faucet', ada: ada('606.4 and 309.4', { expect: true }), mi: mi('606.4 and 309.4', { expect: true }) },
          { id: 'lv-mirror', label: 'Mirror above lavatory, bottom of reflecting surface', field: 'mirror', ada: ada('603.3', { max: 40 }), mi: mi('603.3', { max: 40 }) },
          { id: 'lv-cfs-w', label: 'Clear floor space width', field: 'cfs_width', ada: ada('305.3', { min: 30 }), mi: mi('305.3', { min: 30 }) },
          { id: 'lv-cfs-d', label: 'Clear floor space depth', field: 'cfs_depth',
            ada: ada('305.3', { min: 48 }), mi: mi('305.3.1 and 305.3.2', { min: 52 }, { newBuilding: true, elseMin: 48 }),
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
          { id: 'sg-braille', label: 'Braille', field: 'braille', ada: ada('703.3', { expect: true }), mi: mi('703.3.1', { expect: true }) },
          { id: 'sg-finish', label: 'Finish and contrast', field: 'finish', ada: ada('703.5.1', { expect: true }), mi: mi('703.2.10 and 703.3.12', { expect: true }) }
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
          { id: 'ct-height', label: 'Counter height (36 in max)', field: 'height', ada: ada('904.4.1 and 904.4.2', { max: 36 }), mi: mi('904.3.2 and 904.3.3', { max: 36 }) },
          { id: 'ct-len-par', label: 'Counter length, parallel approach', field: 'length', when: { approach: 'parallel' }, ada: ada('904.4.1', { min: 36 }), mi: mi('904.3.2', { min: 36 }),
            note: 'A117.1-2017 also sets the parallel-approach counter 26 in min to 36 in max high.' },
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
          { id: 'ws-height', label: 'Surface height (28 to 34 in)', field: 'height', ada: ada('902.3', { min: 28, max: 34 }), mi: mi('902.4', { min: 28, max: 34 }) },
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
          { id: 'df-wc', label: 'Wheelchair spout height (36 in max)', field: 'wc_spout', ada: ada('602.4', { max: 36 }), mi: mi('602.2.3', { max: 36 }) },
          { id: 'df-stand', label: 'Standing spout height (38 to 43 in)', field: 'stand_spout', ada: ada('602.7', { min: 38, max: 43 }), mi: mi('602.3.2', { min: 38, max: 43 }) },
          { id: 'df-both', label: 'Two heights provided', field: 'both', ada: ada('211.2', { expect: true }), mi: { cite: '2021 MBC §1110.5.1', expect: true, verify: true } }
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
          { id: 'cr-run', label: 'Running slope (1:12 max)', field: 'running_slope', ada: ada('406.1 and 405.2', { max: 8.33 }), mi: mi('406.2.2 and 406.3.2', { max: 8.33 }) },
          { id: 'cr-cross', label: 'Cross slope (1:48 max)', field: 'cross_slope', ada: ada('406.1 and 405.3', { max: 2.08 }), mi: mi('406.5.3', { max: 2.08 }),
            note: 'Michigan: at crossings without a stop or yield and at midblock crossings, cross slope may match the street grade (A117.1 406.5.3).' },
          { id: 'cr-width', label: 'Clear width', field: 'width', ada: ada('406.1 and 405.5', { min: 36 }), mi: mi('406.5.1', { min: 48 }) },
          { id: 'cr-flare', label: 'Flared sides (1:10 max)', field: 'flare_slope', ada: ada('406.3', { max: 10 }), mi: mi('406.2.3', { max: 10 }),
            note: 'Applies where the flares are part of a pedestrian route; returned curbs are allowed where pedestrians would not cross the sides.' },
          { id: 'cr-counter', label: 'Counter slope (1:20 max)', field: 'counter_slope', ada: ada('406.2', { max: 5 }), mi: mi('406.5.4', { max: 5 }) },
          { id: 'cr-landing', label: 'Top landing length', field: 'landing', ada: ada('406.4', { min: 36 }), mi: mi('406.2.1', { min: 48 }),
            note: 'Michigan: 48 by 48 in landing at the top, 48 by 60 in where constrained at the back of sidewalk (A117.1 406.2.1).' },
          { id: 'cr-flush', label: 'Flush transitions', field: 'flush', ada: ada('406.2', { expect: true }), mi: mi('406.5.2', { expect: true }) }
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
          { id: 'lz-aisle-w', label: 'Access aisle width', field: 'aisle_width', ada: ada('503.3.1', { min: 60 }), mi: mi('503.3.2.1 and 503.3.2.2', { min: 67 }, { newBuilding: true, elseMin: 60 }),
            note: 'A117.1-2017 requires 67 in for new buildings; existing buildings keep 60 in.' },
          { id: 'lz-aisle-l', label: 'Access aisle length (full 20 ft pull-up space)', field: 'aisle_length', ada: ada('503.2 and 503.3.2', { min: 240 }), mi: mi('503.2 and 503.3.3', { min: 240 }) },
          { id: 'lz-slope', label: 'Slope (1:48 max)', field: 'slope', ada: ada('503.4', { max: 2.08 }), mi: mi('503.4', { max: 2.08 }) },
          { id: 'lz-marked', label: 'Access aisle marked', field: 'marked', ada: ada('503.3.3', { expect: true }), mi: mi('503.3.4', { expect: true }) },
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
          { id: 'bs-depth', label: 'Boarding area depth', field: 'depth', ada: ada('810.2.2', { min: 96 }), mi: mi('805.2.2.1 and 805.2.2.2', { min: 100 }, { newBuilding: true, elseMin: 96 }) },
          { id: 'bs-width', label: 'Boarding area width', field: 'width', ada: ada('810.2.2', { min: 60 }), mi: mi('805.2.2.1 and 805.2.2.2', { min: 60 }) },
          { id: 'bs-slope', label: 'Slope perpendicular to the road (1:48 max)', field: 'slope', ada: ada('810.2.4', { max: 2.08 }), mi: mi('805.2.3', { max: 2.08 }) },
          { id: 'bs-route', label: 'Connected by accessible route', field: 'route', ada: ada('810.2.3', { expect: true }), mi: mi('805.2.4', { expect: true }) }
        ]
      },
      {
        id: 'entrance_signs', label: 'Entrance signs (symbol and directions)', group: 'Doors',
        fields: [
          { id: 'isa', type: 'bool', label: 'Accessible entrance marked with the International Symbol of Accessibility?' },
          { id: 'directional', type: 'bool', label: 'Entrances that are not accessible have signs pointing to the accessible one?', allowNA: true }
        ],
        checks: [
          { id: 'es-isa', label: 'Accessible entrance identified', field: 'isa', ada: ada('216.6', { expect: true }), mi: { cite: '2021 MBC §1112.1, item 5', expect: true, verify: true } },
          { id: 'es-dir', label: 'Directional signs at other entrances', field: 'directional', ada: ada('216.6', { expect: true }), mi: { cite: '2021 MBC §1112.3, item 1', expect: true, verify: true },
            note: 'Not required where every entrance is accessible.' }
        ]
      },
      {
        id: 'ev_charger', label: 'EV charging station', group: 'Site',
        scopeNote: 'The ADA Accessibility Guidelines have no EV charging rules. The 2021 Michigan Building Code sets how many must be accessible for chargers installed under it; the sizes and reach come from US Access Board recommendations and are reported as best practice.',
        fields: [
          { id: 'total', type: 'count', label: 'Total parking spaces served by EV chargers at this site' },
          { id: 'accessible', type: 'count', label: 'Accessible EV charging spaces' },
          { id: 'space_width', type: 'len', label: 'Accessible charging space width' },
          { id: 'aisle_width', type: 'len', label: 'Access aisle width beside it', allowNA: true },
          { id: 'slope', type: 'slope', label: 'Steepest slope in the space or aisle' },
          { id: 'route', type: 'bool', label: 'Charger and space connect to an accessible route?' },
          { id: 'cfs', type: 'bool', label: '30 x 48 in clear floor space at the charger, not blocked by curbs or wheel stops?' },
          { id: 'reach_high', type: 'len', label: 'Highest operable part (screen, card reader, connector holster)' },
          { id: 'reach_low', type: 'len', label: 'Lowest operable part' },
          { id: 'cord', type: 'bool', label: 'Cord reaches the vehicle without crossing the access aisle or a curb?' },
          { id: 'signed', type: 'bool', label: 'Accessible charging space open to all drivers (not reserved for placard holders only)?', allowNA: true }
        ],
        checks: [
          { id: 'ev-count', label: 'Accessible EV charging spaces (5% min, at least 1)', kind: 'ratio', num: 'accessible', den: 'total', minPct: 5, newOnly: true,
            mi: { cite: '2021 MBC §1107.2.1', verify: true },
            note: 'Federal rules set no number; the ADA requires a "reasonable number" and the Access Board recommends at least two accessible charging spaces. Michigan also requires at least one accessible space for each type of charger (MBC 1107.2.1). Chargers serving Group R-2, R-3 and R-4 housing are exempt. Applies to chargers installed under the 2021 Michigan Building Code; for older installations the count is shown as best practice.' },
          { id: 'ev-width', label: 'Space width (132 in min)', field: 'space_width', newOnly: true, mi: { cite: '2021 MBC §1107.2.2', min: 132, verify: true }, bp: bp(EV_BP, { min: 132 }) },
          { id: 'ev-aisle', label: 'Access aisle width (60 in min)', field: 'aisle_width', newOnly: true, mi: { cite: '2021 MBC §1107.2.2', min: 60, verify: true }, bp: bp(EV_BP, { min: 60 }) },
          { id: 'ev-slope', label: 'Space and aisle slope (1:48 max)', field: 'slope', bp: bp(EV_BP, { max: 2.08 }) },
          { id: 'ev-route', label: 'On an accessible route', field: 'route', ada: ada('206.2.2 and 402', { expect: true }),
            note: 'The Access Board confirms accessible EV chargers must be on an accessible route (Design Recommendations for Accessible EV Charging Stations).' },
          { id: 'ev-cfs', label: 'Clear floor space at the charger (30 x 48 in)', field: 'cfs', ada: ada('305', { expect: true }),
            note: 'Required for a reasonable number of chargers. The Access Board recommends a parallel approach centered on the operable parts, with no curbs, wheel stops or bollards in the space.' },
          { id: 'ev-high', label: 'Highest operable part (48 in max)', field: 'reach_high', ada: ada('309.3 and 308', { max: 48 }),
            note: 'The Access Board recommends an unobstructed side reach (308.3.1): 48 in max, within 10 in of the clear floor space.' },
          { id: 'ev-low', label: 'Lowest operable part (15 in min)', field: 'reach_low', ada: ada('309.3 and 308', { min: 15 }) },
          { id: 'ev-cord', label: 'Cord reach', field: 'cord', bp: bp(EV_BP, { expect: true }) },
          { id: 'ev-sign', label: 'Not reserved for placard holders only', field: 'signed', bp: bp(EV_BP, { expect: true }),
            note: 'The Access Board does not recommend ISA signs at accessible EV charging spaces unless a state or local code requires them (the 2021 MBC does not list EV spaces in 1112.1). It suggests a "use last" approach so the charger is not left unused.' }
        ]
      },
      {
        id: 'lighting', label: 'Exterior lighting (route, parking, entrance)', group: 'Site',
        scopeNote: 'No ADA or Michigan accessibility rule sets exterior light levels. These are reported as best practice, never as violations.',
        fields: [
          { id: 'route_lit', type: 'bool', label: 'Accessible route from parking to the entrance is evenly lit after dark?' },
          { id: 'parking_lit', type: 'bool', label: 'Accessible parking spaces and access aisles are lit?' },
          { id: 'entrance_lit', type: 'bool', label: 'Accessible entrance, its door hardware and signs are lit?' },
          { id: 'changes_lit', type: 'bool', label: 'Steps, ramps and curb ramps are lit without glare or deep shadows?', allowNA: true }
        ],
        checks: [
          { id: 'lt-route', label: 'Route lit', field: 'route_lit', bp: bp(LIGHT_BP, { expect: true }) },
          { id: 'lt-park', label: 'Accessible parking lit', field: 'parking_lit', bp: bp(LIGHT_BP, { expect: true }) },
          { id: 'lt-door', label: 'Accessible entrance lit', field: 'entrance_lit', bp: bp(LIGHT_BP, { expect: true }) },
          { id: 'lt-change', label: 'Level changes lit without glare', field: 'changes_lit', bp: bp(LIGHT_BP, { expect: true }),
            note: 'Even light and contrast help people with low vision find steps and curb edges.' }
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
          { id: 'pa-route', label: 'Play area on an accessible route', field: 'route', ada: ada('206.2.17', { expect: true }), mi: { cite: '2021 MBC §1111.4.13', expect: true, verify: true } },
          { id: 'pa-elev', label: 'At least 50% of elevated components on an accessible route', kind: 'ratio', num: 'elevated_route', den: 'elevated_total', minPct: 50,
            ada: ada('240.2.2'), mi: mi('1008.3.2.2') },
          { id: 'pa-ramp', label: 'With 20 or more elevated components, at least 25% reached by ramp', kind: 'ratio', num: 'elevated_ramp', den: 'elevated_total', minPct: 25,
            when: { elevated_total: { gt: 19 } }, ada: ada('1008.2.1, Exception 1'), mi: mi('1008.4.1, Exception 1') },
          { id: 'pa-ground', label: 'Ground-level components: number and types', kind: 'manual', ada: ada('240.2.1 (Table 240.2.1.2)'), mi: mi('1008.3.2.1 (Table 1008.3.2.1.2)'),
            note: 'At least one of each type of ground-level component must be on a route; Table 240.2.1.2 adds more based on the number of elevated components. Compare with the counts recorded.' },
          { id: 'pa-gwidth', label: 'Ground-level route width', field: 'ground_width', ada: ada('1008.2.4.1', { min: 60, verify: true }), mi: mi('1008.4.1.1.1', { min: 60 }),
            note: 'May narrow to 36 in for 60 in max length in play areas under 1,000 sq ft, with conditions (ADA 1008.2.4.1 Exceptions).' },
          { id: 'pa-surf', label: 'Accessible surfacing', field: 'surface_access', ada: ada('1008.2.6.1', { expect: true }), mi: mi('1008.4.1.3.1', { expect: true }) },
          { id: 'pa-impact', label: 'Impact-attenuating surfacing in use zones', field: 'surface_impact', ada: ada('1008.2.6.2', { expect: true }), mi: mi('1008.4.1.3.2', { expect: true }) },
          { id: 'pa-turn', label: 'Turning space', field: 'turning', ada: ada('1008.4.1', { expect: true, verify: true }), mi: mi('1008.4.3.1', { expect: true }) }
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
          { id: 'pr-slope-g', label: 'Ground-level ramp slope (1:16 max)', field: 'running_slope', when: { level: 'ground' }, ada: ada('1008.2.5.1', { max: 6.25, verify: true }), mi: mi('1008.4.1.2.1', { max: 6.25 }) },
          { id: 'pr-slope-e', label: 'Elevated ramp slope (1:12 max)', field: 'running_slope', when: { level: 'elevated' }, ada: ada('1008.2.5 and 405.2', { max: 8.33, verify: true }), mi: mi('1008.4.1.2 and 405.2', { max: 8.33 }) },
          { id: 'pr-rise', label: 'Rise per run, elevated (12 in max)', field: 'rise', when: { level: 'elevated' }, ada: ada('1008.2.5.2', { max: 12, verify: true }), mi: mi('1008.4.1.2.2', { max: 12 }) },
          { id: 'pr-width', label: 'Elevated route width', field: 'width', when: { level: 'elevated' }, ada: ada('1008.2.4.2', { min: 36, verify: true }), mi: mi('1008.4.1.1.2', { min: 36 }) },
          { id: 'pr-width-g', label: 'Ground-level route width', field: 'width', when: { level: 'ground' }, ada: ada('1008.2.4.1', { min: 60, verify: true }), mi: mi('1008.4.1.1.1', { min: 60 }) },
          { id: 'pr-rail', label: 'Handrail height (20 to 28 in)', field: 'handrail_height', ada: ada('1008.2.5.3.2', { min: 20, max: 28, verify: true }), mi: mi('1008.4.1.2.3.2', { min: 20, max: 28 }),
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
          { id: 'pt-h-plat', label: 'Transfer platform height (11 to 18 in)', field: 'height', when: { kind: 'platform' }, ada: ada('1008.3.1.2', { min: 11, max: 18, verify: true }), mi: mi('1008.4.2.1.2', { min: 11, max: 18 }) },
          { id: 'pt-h-step', label: 'Transfer step height (8 in max)', field: 'height', when: { kind: 'step' }, ada: ada('1008.3.2.2', { max: 8, verify: true }), mi: mi('1008.4.2.2.2', { max: 8 }) },
          { id: 'pt-w', label: 'Clear width (24 in min)', field: 'width', ada: ada('1008.3.1.1 and 1008.3.2.1', { min: 24, verify: true }), mi: mi('1008.4.2.1.1 and 1008.4.2.2.1', { min: 24 }) },
          { id: 'pt-d', label: 'Clear depth (14 in min)', field: 'depth', ada: ada('1008.3.1.1 and 1008.3.2.1', { min: 14, verify: true }), mi: mi('1008.4.2.1.1 and 1008.4.2.2.1', { min: 14 }) },
          { id: 'pt-sup', label: 'Transfer supports', field: 'supports', ada: ada('1008.3.1.4 and 1008.3.2.3', { expect: true, verify: true }), mi: mi('1008.4.2.1.4 and 1008.4.2.2.3', { expect: true }) }
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
          { id: 'pc-route', label: 'On an accessible route', field: 'route', ada: ada('240.2 and 1008.2', { expect: true }), mi: mi('1008.2', { expect: true }) },
          { id: 'pc-cfs', label: 'Clear floor space', field: 'cfs', ada: ada('1008.4.2', { expect: true, verify: true }), mi: mi('1008.4.3.2', { expect: true }) },
          { id: 'pc-entry', label: 'Seat or entry point height (11 to 24 in)', field: 'entry_height', when: { kind: 'seat' }, ada: ada('1008.4.4', { min: 11, max: 24, verify: true }), mi: mi('1008.4.3.4', { min: 11, max: 24 }) },
          { id: 'pc-table', label: 'Play table height (31 in max)', field: 'table_height', when: { kind: 'table' }, ada: ada('1008.4.3', { max: 31, verify: true }), mi: mi('1008.4.3.3', { max: 31 }) },
          { id: 'pc-knee', label: 'Play table knee clearance (24 in min)', field: 'table_knee', when: { kind: 'table' }, ada: ada('1008.4.3', { min: 24, verify: true }), mi: mi('1008.4.3.3', { min: 24 }),
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
            ada: ada('242.2 and 242.4'), mi: { cite: '2021 MBC §1111.4.14; ' + MI + ' §1009.1.1', verify: true } },
          { id: 'pl-wading', label: 'Wading pool sloped entry', field: 'wading_slope', when: { kind: 'wading' }, ada: ada('242.3', { expect: true }), mi: { cite: '2021 MBC §1111.4.14; ' + MI + ' §1009.1.2', expect: true, verify: true } }
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
          { id: 'lf-depth', label: 'Located where water is 48 in deep max', field: 'water_depth', ada: ada('1009.2.1', { max: 48 }), mi: mi('1009.2.1', { max: 48 }),
            note: 'Exception where the entire pool is deeper than 48 in.' },
          { id: 'lf-seat', label: 'Seat height (16 to 19 in)', field: 'seat_height', ada: ada('1009.2.4', { min: 16, max: 19, verify: true }), mi: mi('1009.2.4', { min: 16, max: 19 }) },
          { id: 'lf-width', label: 'Seat width (16 in min)', field: 'seat_width', ada: ada('1009.2.5', { min: 16, verify: true }), mi: mi('1009.2.5', { min: 16 }) },
          { id: 'lf-sub', label: 'Submerged depth (18 in min)', field: 'submerge', ada: ada('1009.2.8', { min: 18, verify: true }), mi: mi('1009.2.8', { min: 18 }) },
          { id: 'lf-foot', label: 'Footrest', field: 'footrest', ada: ada('1009.2.6', { expect: true, verify: true }), mi: mi('1009.2.6', { expect: true }) },
          { id: 'lf-op', label: 'Independent operation', field: 'operable', ada: ada('1009.2.7', { expect: true, verify: true }), mi: mi('1009.2.7', { expect: true }) },
          { id: 'lf-cap', label: 'Lifting capacity (300 lb min)', field: 'capacity', ada: ada('1009.2.9', { min: 300, verify: true }), mi: mi('1009.2.9', { min: 300 }) },
          { id: 'lf-deck', label: 'Clear deck space', field: 'deck', ada: ada('1009.2.3', { expect: true, verify: true }), mi: mi('1009.2.3', { expect: true }),
            note: 'ADA: 36 in wide, extending 48 in forward. A117.1-2017: 52 in forward in new buildings (1009.2.3.1).' }
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
          { id: 'ps-slope', label: 'Running slope (1:12 max)', field: 'slope', ada: ada('1009.3.1 and 405.2', { max: 8.33, verify: true }), mi: mi('1009.3.1 and 405.2', { max: 8.33 }) },
          { id: 'ps-depth', label: 'Submerged depth (24 to 30 in)', field: 'submerged', ada: ada('1009.3.2', { min: 24, max: 30, verify: true }), mi: mi('1009.3.2.1', { min: 24, max: 30 }) },
          { id: 'ps-rails', label: 'Handrails both sides', field: 'handrails', ada: ada('1009.3.3', { expect: true, verify: true }), mi: mi('1009.3.3', { expect: true }) }
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
          { id: 'tw-h', label: 'Height (16 to 19 in)', field: 'height', ada: ada('1009.4.2', { min: 16, max: 19, verify: true }), mi: mi('1009.4.2', { min: 16, max: 19 }) },
          { id: 'tw-d', label: 'Depth (12 to 16 in)', field: 'depth', ada: ada('1009.4.3', { min: 12, max: 16, verify: true }), mi: mi('1009.4.3', { min: 12, max: 16 }) },
          { id: 'tw-l', label: 'Length (60 in min)', field: 'length', ada: ada('1009.4.3', { min: 60, verify: true }), mi: mi('1009.4.3', { min: 60 }) },
          { id: 'tw-grab', label: 'Grab bar', field: 'grab', ada: ada('1009.4.5', { expect: true, verify: true }), mi: mi('1009.4.5', { expect: true }) }
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
          { id: 'as-count', label: 'Number of wheelchair spaces', kind: 'seatCount', fields: ['seats', 'wc_spaces'], ada: ada('221.2.1.1 (Table 221.2.1.1)'), mi: { cite: '2021 MBC §1109.2.2.1 (Table 1109.2.2.1)', verify: true },
            note: 'Michigan needs 5 wheelchair spaces for 101 to 150 seats, where the ADA needs 4; the app uses the larger number.' },
          { id: 'as-w1', label: 'Width, single space (36 in min)', field: 'space_width', when: { pairing: 'single' }, ada: ada('802.1.2', { min: 36 }), mi: mi('802.3', { min: 36 }) },
          { id: 'as-w2', label: 'Width, each of two spaces (33 in min)', field: 'space_width', when: { pairing: 'pair' }, ada: ada('802.1.2', { min: 33 }), mi: mi('802.3', { min: 33 }) },
          { id: 'as-df', label: 'Depth, front or rear entry (48 in min)', field: 'space_depth', when: { entry: 'front' }, ada: ada('802.1.3', { min: 48 }), mi: mi('802.4.1 and 802.4.2', { min: 52 }, { newBuilding: true, elseMin: 48 }),
            note: 'Michigan: 52 in for new buildings, 48 in for existing.' },
          { id: 'as-ds', label: 'Depth, side entry (60 in min)', field: 'space_depth', when: { entry: 'side' }, ada: ada('802.1.3', { min: 60 }), mi: mi('802.4.1 and 802.4.2', { min: 60 }) },
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
          { id: 'fp-rail', label: 'Lowered railings', field: 'rail_pct', ada: ada('1005.2.1', { expect: true }), mi: mi('1005.3.1', { expect: true }) },
          { id: 'fp-edge', label: 'Edge protection (2 in min)', field: 'edge', ada: ada('1005.3.1', { min: 2, verify: true }), mi: mi('1005.4.1', { min: 2 }) },
          { id: 'fp-cfs', label: 'Clear floor space', field: 'cfs', ada: ada('1005.4', { expect: true }), mi: mi('1005.5', { expect: true }) },
          { id: 'fp-turn', label: 'Turning space', field: 'turning', ada: ada('1005.5', { expect: true }), mi: mi('1005.6', { expect: true }) }
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
          { id: 'bt-gang', label: 'Gangway slope (1:12 max, exceptions apply)', field: 'gangway_slope', ada: ada('1003.2.1', { max: 8.33, verify: true }), mi: mi('1003.2.1', { max: 8.33 }),
            note: 'Longer gangways and tidal or changing water levels have exceptions (ADA 1003.2.1 Exceptions); check them before reporting a failure.' },
          { id: 'bt-pier', label: 'Clear pier space width (60 in min)', field: 'pier_width', ada: ada('1003.3.1', { min: 60, verify: true }), mi: mi('1003.3.1', { min: 60 }) },
          { id: 'bt-route', label: 'Accessible route', field: 'route', ada: ada('206.2.10 and 1003.2', { expect: true }), mi: mi('1003.2', { expect: true }) }
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
          { id: 'gf-car', label: 'Golf car passage width (48 in min)', field: 'car_passage', when: { kind: 'golf' }, ada: ada('1006.3.1', { min: 48, verify: true }), mi: mi('1006.3.1', { min: 48 }) },
          { id: 'gf-mini', label: 'At least 50% of mini golf holes on an accessible route', kind: 'ratio', num: 'holes_route', den: 'holes', minPct: 50, when: { kind: 'mini' },
            ada: ada('239.2 and 1007.2'), mi: mi('1007.2') }
        ]
      },
      {
        id: 'exercise', label: 'Exercise equipment or fitness station', group: 'Recreation',
        fields: [
          { id: 'each_type', type: 'bool', label: 'At least one of each type of equipment is on an accessible route?' },
          { id: 'cfs', type: 'bool', label: '30 x 48 in clear floor space at each accessible machine?' }
        ],
        checks: [
          { id: 'ex-type', label: 'One of each type on a route', field: 'each_type', ada: ada('236.1', { expect: true }), mi: { cite: '2021 MBC §1111.4.10; ' + MI + ' §1004', expect: true, verify: true } },
          { id: 'ex-cfs', label: 'Clear floor space', field: 'cfs', ada: ada('1004.1', { expect: true }), mi: mi('1004.2', { expect: true }) }
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
          { id: 'pn-route', label: 'On an accessible route', field: 'route', ada: ada('206.2.2 and 226.1', { expect: true }), mi: { cite: '2021 MBC §1110.12.1 and §1104.2', expect: true, verify: true } },
          { id: 'pn-height', label: 'Table height (28 to 34 in), if treated as a dining surface', field: 'height', ada: ada('226.1 and 902.3', { min: 28, max: 34 }), mi: mi('902.4', { min: 28, max: 34 }) },
          { id: 'pn-knee', label: 'Knee clearance (27 in min), if treated as a dining surface', field: 'knee', ada: ada('902.2 and 306.3', { min: 27 }), mi: mi('902.2 and 306.3', { min: 27 }) },
          { id: 'pn-scope', label: 'Whether picnic tables and outdoor benches are covered at this site', kind: 'manual', ada: ada('226.1'), mi: { cite: '2021 MBC §1110.12 (5%, at least one, of fixed or built-in tables)', verify: true },
            note: 'The ADA Accessibility Guidelines have no picnic-table or park-bench rules; dining-surface rules (5% accessible) are applied here by practice. For park picnic tables under Chapter 10 of the ADA and ABA Accessibility Guidelines, record "Picnic table (park or picnic area)".' }
        ]
      },
      // ================================================================ Rides, shooting ranges, saunas (ADA 234, 241, 243)
      {
        id: 'amusement_ride', label: 'Amusement ride', group: 'Recreation',
        fields: [
          { id: 'access', type: 'choice', label: 'How does a wheelchair user ride?', options: [
            { id: 'wc', label: 'Wheelchair space on the ride' },
            { id: 'transfer', label: 'Ride seat designed for transfer' },
            { id: 'device', label: 'Transfer device (lift or board)' },
            { id: 'none', label: 'None of these' },
            { id: 'exempt', label: 'Exempt: mobile or portable ride, rider-controlled ride, children\'s ride with adult help, or no seats' }] },
          { id: 'route', type: 'bool', label: 'Accessible route to the load and unload areas?' },
          { id: 'turning', type: 'bool', label: 'Turning space in the load and unload areas?' },
          { id: 'load_slope', type: 'slope', label: 'Steepest slope in the load and unload areas' },
          { id: 'entry', type: 'len', label: 'Wheelchair space rides: clear opening into the space' },
          { id: 'space', type: 'bool', label: 'Wheelchair space rides: space at least 30 x 48 in, slope 1:48 max?' },
          { id: 'companion', type: 'bool', label: 'Wheelchair space rides: companion seat next to the space?', allowNA: true },
          { id: 'seat_height', type: 'len', label: 'Transfer seat rides: seat height above the load surface' },
          { id: 'signs', type: 'bool', label: 'Sign at the queue entrance shows the type of access and where to board?' }
        ],
        checks: [
          { id: 'ar-access', label: 'At least one wheelchair space, transfer seat or transfer device', kind: 'choiceOk', field: 'access', okOptions: ['wc', 'transfer', 'device'], naOptions: ['exempt'],
            naReason: 'This kind of ride is exempt from the ride-seat requirement (ADA 234.3 Exceptions).',
            ada: ada('234.3'), mi: { cite: '2021 MBC §1111.4.8.3; ' + MI + ' §1002.1', verify: true } },
          { id: 'ar-route', label: 'Accessible route to load and unload areas', field: 'route', when: { access: ['wc', 'transfer', 'device'] }, ada: ada('206.2.9 and 1002.2', { expect: true }), mi: mi('1002.2', { expect: true }, { verify: false }) },
          { id: 'ar-turn', label: 'Turning space at load and unload areas', field: 'turning', when: { access: ['wc', 'transfer', 'device'] }, ada: ada('1002.3', { expect: true, verify: true }), mi: mi('1002.3 and 304', { expect: true }, { verify: false }) },
          { id: 'ar-slope', label: 'Load and unload area slope (1:48 max)', field: 'load_slope', when: { access: ['wc', 'transfer', 'device'] }, ada: ada('1002.3 and 304.2', { max: 2.08, verify: true }), mi: mi('1002.3 and 304.2', { max: 2.08 }) },
          { id: 'ar-entry', label: 'Opening into the wheelchair space (32 in min)', field: 'entry', when: { access: 'wc' }, ada: ada('1002.4.5', { min: 32 }), mi: mi('1002.4.5', { min: 32 }, { verify: false }) },
          { id: 'ar-space', label: 'Wheelchair space size and slope', field: 'space', when: { access: 'wc' }, ada: ada('1002.4.2 and 1002.4.4', { expect: true, verify: true }), mi: mi('1002.4.2 and 1002.4.4.1', { expect: true }, { verify: false }) },
          { id: 'ar-comp', label: 'Companion seat', field: 'companion', when: { access: 'wc' }, ada: ada('1002.4.7', { expect: true }), mi: mi('1002.4.7', { expect: true }, { verify: false }),
            note: 'Required where the ride interior is wider than 53 in, seats more than one rider, and the wheelchair space is not in the center (ADA 1002.4.7). Otherwise mark N/A.' },
          { id: 'ar-seat', label: 'Transfer seat height (14 to 24 in)', field: 'seat_height', when: { access: 'transfer' }, ada: ada('1002.5.2', { min: 14, max: 24 }), mi: mi('1002.5.2', { min: 14, max: 24 }, { verify: false }) },
          { id: 'ar-signs', label: 'Signs at queue entrances', field: 'signs', when: { access: ['wc', 'transfer', 'device'] }, ada: ada('216.12', { expect: true }),
            note: 'Federal only: the 2021 MBC has no matching sign requirement for amusement rides.' }
        ]
      },
      {
        id: 'shooting', label: 'Shooting range (firing positions)', group: 'Recreation',
        scopeNote: 'Record each type of firing position (for example standing rifle stations, archery lanes, trap houses) as its own item.',
        fields: [
          { id: 'kind_name', type: 'choice', label: 'Type of firing position', options: [{ id: 'range', label: 'Rifle or pistol range station' }, { id: 'archery', label: 'Archery lane or stand' }, { id: 'trap', label: 'Trap, skeet or sporting clays station' }, { id: 'other', label: 'Other' }] },
          { id: 'total', type: 'count', label: 'Firing positions of this type' },
          { id: 'accessible', type: 'count', label: 'Accessible firing positions of this type' },
          { id: 'route', type: 'bool', label: 'Accessible positions are on an accessible route?' },
          { id: 'turning', type: 'bool', label: '60 in turning circle at each accessible position?' },
          { id: 'slope', type: 'slope', label: 'Steepest slope at the accessible position' },
          { id: 'counter', type: 'len', label: 'If people fire over a counter or wall here: its height', allowNA: true }
        ],
        checks: [
          { id: 'sh-count', label: 'Accessible firing positions (5% of each type, at least 1)', kind: 'ratio', num: 'accessible', den: 'total', minPct: 5, ada: ada('243'), mi: { cite: '2021 MBC §1111.4.15', verify: true } },
          { id: 'sh-route', label: 'On an accessible route', field: 'route', ada: ada('206.2.2 and 243', { expect: true, verify: true }), mi: { cite: '2021 MBC §1111.4.15', expect: true, verify: true } },
          { id: 'sh-turn', label: 'Turning space', field: 'turning', ada: ada('1010.1 and 304.3.1', { expect: true }), mi: mi('1010.2 and 304.3.1', { expect: true }, { verify: false }) },
          { id: 'sh-slope', label: 'Slope at the position (1:48 max)', field: 'slope', ada: ada('1010.1', { max: 2.08 }), mi: mi('1010.2', { max: 2.08 }, { verify: false }) },
          { id: 'sh-counter', label: 'Counter or wall height where firing over it (34 in max)', field: 'counter', mi: mi('1010.3', { max: 34 }, { verify: false }),
            note: 'Michigan (ICC A117.1) rule; the ADA Accessibility Guidelines have no firing-counter height. Where other positions of the same type have counters, the accessible one needs an equivalent counter.' }
        ]
      },
      {
        id: 'sauna', label: 'Sauna or steam room', group: 'Recreation',
        scopeNote: 'Where saunas or steam rooms are in a cluster, 5% (at least one) of each type must comply (ADA 241).',
        fields: [
          { id: 'turning', type: 'bool', label: 'Turning space inside the room?' },
          { id: 'bench', type: 'bool', label: 'Is there seating in the room?' },
          { id: 'bench_len', type: 'len', label: 'Accessible bench length' },
          { id: 'bench_depth', type: 'len', label: 'Accessible bench seat depth' },
          { id: 'bench_ht', type: 'len', label: 'Bench seat height above the floor' },
          { id: 'back', type: 'bool', label: 'Back support or wall along the full bench length?' },
          { id: 'cfs', type: 'bool', label: '30 x 48 in clear floor space at the end of the bench?' },
          { id: 'door', type: 'bool', label: 'Door swings clear of that floor space?' }
        ],
        checks: [
          { id: 'sa-turn', label: 'Turning space', field: 'turning', ada: ada('612.3', { expect: true }), mi: mi('612.3', { expect: true }, { verify: false }),
            note: 'Under the ADA a readily removable bench may overlap the turning space (ADA 612.3 Exception). ICC A117.1 has no such exception, but lets door and bench clearances overlap the turning space.' },
          { id: 'sa-len', label: 'Bench length (42 in min)', field: 'bench_len', when: { bench: true }, ada: ada('612.2 and 903.3', { min: 42 }), mi: mi('612.2 and 903.3', { min: 42 }, { verify: false }) },
          { id: 'sa-depth', label: 'Bench depth (20 to 24 in)', field: 'bench_depth', when: { bench: true }, ada: ada('612.2 and 903.3', { min: 20, max: 24 }), mi: mi('612.2 and 903.3', { min: 20, max: 24 }, { verify: false }) },
          { id: 'sa-ht', label: 'Bench height (17 to 19 in)', field: 'bench_ht', when: { bench: true }, ada: ada('612.2 and 903.5', { min: 17, max: 19 }), mi: mi('612.2 and 903.5', { min: 17, max: 19 }, { verify: false }) },
          { id: 'sa-back', label: 'Back support', field: 'back', when: { bench: true }, ada: ada('612.2 and 903.4', { expect: true }), mi: mi('612.2 and 903.4', { expect: true }, { verify: false }) },
          { id: 'sa-cfs', label: 'Clear floor space at the bench', field: 'cfs', when: { bench: true }, ada: ada('612.2 and 903.2', { expect: true }), mi: mi('612.2 and 903.2', { expect: true }, { verify: false }) },
          { id: 'sa-door', label: 'Door does not swing into the bench clear floor space', field: 'door', when: { bench: true }, ada: ada('612.2', { expect: true }), mi: mi('612.2', { expect: true }, { verify: false }),
            note: 'Michigan (ICC A117.1 612.2 Exception): in a single-user room the door may swing over the bench space if a 30 x 48 in clear floor space is left beyond the door swing.' }
        ]
      },
      {
        id: 'play_safety', label: 'Playground safety check (not accessibility)', group: 'Recreation',
        scopeNote: 'Michigan\'s Playground Equipment Safety Act is a safety law, not an accessibility code. These items are reported separately as safety notes and are never counted as accessibility violations. A certified playground safety inspector (CPSI) should confirm any concern.',
        fields: [
          { id: 'surfacing', type: 'bool', label: 'Protective surfacing under and around equipment, filled to its marked depth?' },
          { id: 'use_zone', type: 'bool', label: 'At least 6 ft clear use zone around equipment, with no hard objects?' },
          { id: 'entrapment', type: 'bool', label: 'No openings between 3.5 and 9 in that could trap a child\'s head?' },
          { id: 'repair', type: 'bool', label: 'No broken parts, sharp edges, protruding bolts, or missing hardware?' },
          { id: 'inspected', type: 'bool', label: 'Owner has a recent inspection record from a certified inspector?', allowNA: true }
        ],
        checks: [
          { id: 'ps-surf', label: 'Protective surfacing', field: 'surfacing', bp: bp(PLAY_SAFE, { expect: true }), adviceReason: 'Safety concern, not an accessibility requirement. Refer to a certified playground safety inspector.' },
          { id: 'ps-zone', label: 'Use zones clear (6 ft min)', field: 'use_zone', bp: bp(PLAY_SAFE, { expect: true }), adviceReason: 'Safety concern, not an accessibility requirement. Refer to a certified playground safety inspector.' },
          { id: 'ps-trap', label: 'No head entrapment openings', field: 'entrapment', bp: bp(PLAY_SAFE, { expect: true }), adviceReason: 'Safety concern, not an accessibility requirement. Refer to a certified playground safety inspector.' },
          { id: 'ps-repair', label: 'Equipment in good repair', field: 'repair', bp: bp(PLAY_SAFE, { expect: true }), adviceReason: 'Safety concern, not an accessibility requirement. Refer to a certified playground safety inspector.' },
          { id: 'ps-insp', label: 'Inspection record', field: 'inspected', bp: bp(PLAY_SAFE, { expect: true }), adviceReason: 'Safety concern, not an accessibility requirement. Ask the owner to have the playground inspected.' }
        ]
      },
      // ================================================================ Outdoor developed areas (ABA Chapter 10)
      // ABA-only checks: required when the visit says federal funds apply, best practice when not.
      {
        id: 'trail', label: 'Trail, nature path or wetland boardwalk', group: 'Trails and parks (ADA and ABA Guidelines, Ch. 10)',
        scopeNote: 'ADA and ABA Accessibility Guidelines, Chapter 10. Required for federal agencies and when federal funds apply; otherwise reported as best practice. Use this for trails and boardwalks; use "Outdoor recreation access route" for paths linking parking, picnic, camping and viewing areas.',
        fields: [
          { id: 'surface', type: 'bool', label: 'Tread surface firm and stable?' },
          { id: 'tread', type: 'choice', label: 'Surface material', options: [ { id: 'paved', label: 'Asphalt, concrete or boards' }, { id: 'other', label: 'Other (crushed stone, soil, mulch, etc.)' } ] },
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
          { id: 'tr-surf', label: 'Firm and stable surface', field: 'surface', aba: aba('1017.2', { expect: true }) },
          { id: 'tr-width', label: 'Clear tread width (36 in min)', field: 'width', aba: aba('1017.3', { min: 36 }), note: 'Narrower is allowed only where a condition in ABA 1019 (such as terrain or protected resources) prevents full compliance (1017.1, Exception 1).' },
          { id: 'tr-pass', label: 'Passing spaces', field: 'passing', aba: aba('1017.4', { expect: true }) },
          { id: 'tr-obst-p', label: 'Tread obstacles, paved or boards (1/2 in max)', field: 'obstacle', when: { tread: 'paved' }, aba: aba('1017.5', { max: 0.5 }) },
          { id: 'tr-obst', label: 'Tread obstacles, other surfaces (2 in max)', field: 'obstacle', when: { tread: 'other' }, aba: aba('1017.5, Exception', { max: 2 }) },
          { id: 'tr-open', label: 'Openings (1/2 in max)', field: 'opening', aba: aba('1017.6', { max: 0.5 }) },
          { id: 'tr-run', label: 'Running slope and segment length', kind: 'abaSlope', segments: [[5, Infinity], [8.33, 200], [10, 30], [12, 10]], aba: aba('1017.7.1') },
          { id: 'tr-30', label: 'No more than 30% of the trail steeper than 1:12', field: 'pct_12', aba: aba('1017.7.1', { expect: true }) },
          { id: 'tr-cross-p', label: 'Cross slope, paved or boards (1:48 max)', field: 'cross_slope', when: { tread: 'paved' }, aba: aba('1017.7.2', { max: 2.08 }) },
          { id: 'tr-cross', label: 'Cross slope, other surfaces (1:20 max)', field: 'cross_slope', when: { tread: 'other' }, aba: aba('1017.7.2, Exception', { max: 5 }), note: '1:20 is allowed on these surfaces only where needed for drainage; otherwise 1:48.' },
          { id: 'tr-rest', label: 'Resting intervals', field: 'resting', aba: aba('1017.8', { expect: true }) },
          { id: 'tr-head', label: 'Headroom (80 in min)', field: 'headroom', aba: aba('1017.9 and 307', { min: 80 }) },
          { id: 'tr-sign', label: 'Trailhead signs', field: 'sign', aba: aba('F216.13 and 1017.10', { expect: true }) }
        ]
      },
      {
        id: 'orar', label: 'Outdoor recreation access route (park path)', group: 'Trails and parks (ADA and ABA Guidelines, Ch. 10)',
        scopeNote: 'ADA and ABA Accessibility Guidelines, Chapter 10 for paths that connect parking, picnic, camping, viewing and toilet areas in a park. Required when federal funds apply; otherwise best practice.',
        fields: [
          { id: 'surface', type: 'bool', label: 'Surface firm and stable?' },
          { id: 'tread', type: 'choice', label: 'Surface material', options: [ { id: 'paved', label: 'Asphalt, concrete or boards' }, { id: 'other', label: 'Other (crushed stone, soil, mulch, etc.)' } ] },
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
          { id: 'or-obst', label: 'Tread obstacles, paved or boards (1/2 in max)', field: 'obstacle', when: { tread: 'paved' }, aba: aba('1016.5', { max: 0.5 }) },
          { id: 'or-obst-o', label: 'Tread obstacles, other surfaces (1 in max)', field: 'obstacle', when: { tread: 'other' }, aba: aba('1016.5, Exception', { max: 1 }) },
          { id: 'or-open', label: 'Openings (1/2 in max)', field: 'opening', aba: aba('1016.6', { max: 0.5 }) },
          { id: 'or-run', label: 'Running slope and segment length', kind: 'abaSlope', segments: [[5, Infinity], [8.33, 50], [10, 30]], aba: aba('1016.7.1') },
          { id: 'or-cross', label: 'Cross slope, paved or boards (1:48 max)', field: 'cross_slope', when: { tread: 'paved' }, aba: aba('1016.7.2', { max: 2.08 }) },
          { id: 'or-cross-o', label: 'Cross slope, other surfaces (1:20 max)', field: 'cross_slope', when: { tread: 'other' }, aba: aba('1016.7.2, Exception', { max: 5 }), note: '1:20 is allowed on these surfaces only where needed for drainage; otherwise 1:48.' },
          { id: 'or-rest', label: 'Resting intervals', field: 'resting', aba: aba('1016.8', { expect: true }) },
          { id: 'or-head', label: 'Headroom (80 in min)', field: 'headroom', aba: aba('1016.9 and 307', { min: 80 }) }
        ]
      },
      {
        id: 'beach_route', label: 'Beach access route', group: 'Trails and parks (ADA and ABA Guidelines, Ch. 10)',
        scopeNote: 'ADA and ABA Accessibility Guidelines, Chapter 10. Required when federal funds apply; otherwise best practice.',
        fields: [
          { id: 'surface', type: 'bool', label: 'Surface firm and stable (mat, boardwalk or hardened path)?' },
          { id: 'tread', type: 'choice', label: 'Surface material', options: [ { id: 'paved', label: 'Asphalt, concrete or boards' }, { id: 'other', label: 'Other (mat, crushed stone, etc.)' } ] },
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
          { id: 'br-cross', label: 'Cross slope, paved or boards (1:48 max)', field: 'cross_slope', when: { tread: 'paved' }, aba: aba('1018.7.2', { max: 2.08 }) },
          { id: 'br-cross-o', label: 'Cross slope, other surfaces (1:20 max)', field: 'cross_slope', when: { tread: 'other' }, aba: aba('1018.7.2, Exception', { max: 5 }), note: '1:20 is allowed on these surfaces only where needed for drainage; otherwise 1:48.' },
          { id: 'br-obst', label: 'Obstacles, paved or boards (1/2 in max)', field: 'obstacle', when: { tread: 'paved' }, aba: aba('1018.5', { max: 0.5 }) },
          { id: 'br-obst-o', label: 'Obstacles, other surfaces (1 in max)', field: 'obstacle', when: { tread: 'other' }, aba: aba('1018.5, Exception', { max: 1 }) },
          { id: 'br-water', label: 'Reaches the water', field: 'reach_water', aba: aba('1018.2', { expect: true }) }
        ]
      },
      {
        id: 'picnic_aba', label: 'Picnic table (park or picnic area)', group: 'Trails and parks (ADA and ABA Guidelines, Ch. 10)',
        scopeNote: 'ADA and ABA Accessibility Guidelines, Chapter 10. Required when federal funds apply; otherwise best practice. For tables at a building\'s dining area use "Picnic table, bench or outdoor seating".',
        fields: [
          { id: 'tables', type: 'count', label: 'Picnic tables in this area' },
          { id: 'tables_ok', type: 'count', label: 'Tables with a wheelchair space and on an outdoor recreation access route' },
          { id: 'height', type: 'len', label: 'Table top height' },
          { id: 'knee', type: 'len', label: 'Knee clearance height at the wheelchair space' },
          { id: 'knee_depth', type: 'len', label: 'Knee clearance depth under the table, at knee height (27 in)' },
          { id: 'cgs', type: 'len', label: 'Clear ground space around the usable sides' },
          { id: 'surface', type: 'bool', label: 'Ground around the table firm and stable, nearly level?' }
        ],
        checks: [
          { id: 'pk-count', label: 'At least 20% of tables accessible', kind: 'ratio', num: 'tables_ok', den: 'tables', minPct: 20, aba: aba('F245.3, F246.3, F247.3.1 and F247.5') },
          { id: 'pk-height', label: 'Table top height (28 to 34 in)', field: 'height', aba: aba('1011.4.1 and 902.3', { min: 28, max: 34 }) },
          { id: 'pk-knee', label: 'Knee clearance height (27 in min)', field: 'knee', aba: aba('1011.4.2 and 306.3.1', { min: 27 }) },
          { id: 'pk-kdepth', label: 'Knee clearance depth at 27 in high (8 in min)', field: 'knee_depth', aba: aba('1011.4.2 and 306.3.3', { min: 8 }), note: 'Also 11 in deep at 9 in high, and toe space 17 in deep (306.2 and 306.3).' },
          { id: 'pk-cgs', label: 'Clear ground space around usable sides (36 in min)', field: 'cgs', aba: aba('1011.2.1 (Table 1011.2.1)', { min: 36 }) },
          { id: 'pk-surf', label: 'Ground surface', field: 'surface', aba: aba('1011.2.2 and 1011.2.3', { expect: true }) }
        ]
      },
      {
        id: 'fire_grill', label: 'Fire ring, grill or cooking surface', group: 'Trails and parks (ADA and ABA Guidelines, Ch. 10)',
        scopeNote: 'ADA and ABA Accessibility Guidelines, Chapter 10. Required when federal funds apply; otherwise best practice.',
        fields: [
          { id: 'height', type: 'len', label: 'Cooking surface height' },
          { id: 'cgs', type: 'bool', label: 'Clear, firm and nearly level ground space around it (48 x 48 in at fire rings, 30 x 48 in at grills)?' },
          { id: 'route', type: 'bool', label: 'On an outdoor recreation access route?' }
        ],
        checks: [
          { id: 'fg-height', label: 'Cooking surface height (15 to 34 in)', field: 'height', aba: aba('1011.5.2', { min: 15, max: 34 }) },
          { id: 'fg-cgs', label: 'Clear ground space', field: 'cgs', aba: aba('1011.2.1 (Table 1011.2.1)', { expect: true }) },
          { id: 'fg-route', label: 'On an access route', field: 'route', aba: aba('F244.5 and F245.4', { expect: true }) }
        ]
      },
      {
        id: 'bench_aba', label: 'Park bench', group: 'Trails and parks (ADA and ABA Guidelines, Ch. 10)',
        scopeNote: 'ADA and ABA Accessibility Guidelines, Chapter 10. Required when federal funds apply; otherwise best practice.',
        fields: [
          { id: 'seat', type: 'len', label: 'Seat height' },
          { id: 'back', type: 'bool', label: 'Back support provided?' },
          { id: 'cgs', type: 'bool', label: '36 x 48 in clear ground space beside one end?' }
        ],
        checks: [
          { id: 'bn-seat', label: 'Seat height (17 to 19 in)', field: 'seat', bp: bp('Best practice (the ADA and ABA Guidelines have no seat height or back rule for outdoor benches; 903 covers locker room benches)', { min: 17, max: 19, verify: false }) },
          { id: 'bn-back', label: 'Back support', field: 'back', bp: bp('Best practice (the ADA and ABA Guidelines have no seat height or back rule for outdoor benches; 903 covers locker room benches)', { expect: true, verify: false }) },
          { id: 'bn-cgs', label: 'Clear ground space beside the bench', field: 'cgs', aba: aba('1011.2.1 (Table 1011.2.1)', { expect: true }) }
        ]
      },
      {
        id: 'campsite', label: 'Campsite or tent pad', group: 'Trails and parks (ADA and ABA Guidelines, Ch. 10)',
        scopeNote: 'ADA and ABA Accessibility Guidelines, Chapter 10. Required when federal funds apply; otherwise best practice.',
        fields: [
          { id: 'surface', type: 'bool', label: 'Tent pad surface firm and stable (allows tent stakes)?' },
          { id: 'slope', type: 'slope', label: 'Steepest slope on the tent pad' },
          { id: 'cgs', type: 'len', label: 'Clear ground space around the tent pad' },
          { id: 'route', type: 'bool', label: 'Connected to parking, toilets and water by an outdoor recreation access route?' }
        ],
        checks: [
          { id: 'cs-surf', label: 'Firm and stable tent pad', field: 'surface', aba: aba('1013.2.2', { expect: true }) },
          { id: 'cs-slope', label: 'Tent pad slope (1:48 max)', field: 'slope', aba: aba('1013.3', { max: 2.08 }), note: '1:20 is allowed on surfaces other than asphalt, concrete and boards where needed for drainage (1013.3, Exception).' },
          { id: 'cs-cgs', label: 'Clear ground space around the pad (48 in min)', field: 'cgs', aba: aba('1013.2.1', { min: 48 }) },
          { id: 'cs-route', label: 'On an access route', field: 'route', aba: aba('F244.2.3.3 and F244.5.1', { expect: true }) }
        ]
      },
      {
        id: 'viewing', label: 'Overlook, viewing area or viewing scope', group: 'Trails and parks (ADA and ABA Guidelines, Ch. 10)',
        scopeNote: 'ADA and ABA Accessibility Guidelines, Chapter 10. Required when federal funds apply; otherwise best practice.',
        fields: [
          { id: 'cgs', type: 'bool', label: '30 x 48 in clear ground space at each distinct viewing spot?' },
          { id: 'view_height', type: 'len', label: 'Railing or wall height in front of the seated view', allowNA: true },
          { id: 'scope', type: 'len', label: 'Viewing scope eyepiece height', allowNA: true },
          { id: 'route', type: 'bool', label: 'On an outdoor recreation access route?' }
        ],
        checks: [
          { id: 'vw-cgs', label: 'Clear ground space at viewing spots', field: 'cgs', aba: aba('1015.2', { expect: true }) },
          { id: 'vw-view', label: 'Clear view at seated eye level', field: 'view_height', kind: 'manual', aba: aba('1015.3'), note: 'The view must be clear between 32 and 51 in above the ground, across the full width of the clear ground space.' },
          { id: 'vw-scope', label: 'Viewing scope eyepiece (43 to 51 in)', field: 'scope', aba: aba('1011.8', { min: 43, max: 51 }) },
          { id: 'vw-route', label: 'On an access route', field: 'route', aba: aba('F246.4', { expect: true }) }
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
          { id: 'vs-route', label: 'Route to the station (36 in min)', field: 'route_width', ada: ada('403.5.1', { min: 36 }), mi: mi('403.5.1', { min: 36 }),
            note: 'Michigan: an outdoor route to the polling place needs 48 in (A117.1 403.5.1).' },
          { id: 'vs-cfs', label: 'Clear floor space', field: 'cfs', ada: ada('305.3', { expect: true }), mi: mi('305.3', { expect: true }) },
          { id: 'vs-height', label: 'Surface height (28 to 34 in)', field: 'height', ada: ada('902.3', { min: 28, max: 34 }), mi: mi('902.4', { min: 28, max: 34 }) },
          { id: 'vs-knee', label: 'Knee clearance (27 in min)', field: 'knee', ada: ada('306.3', { min: 27 }), mi: mi('306.3', { min: 27 }) },
          { id: 'vs-reach', label: 'Controls within reach (48 in max)', field: 'reach_high', ada: ada('308.2.1 and 308.3.1', { max: 48 }), mi: mi('308.2.1 and 308.3.1', { max: 48 }) },
          { id: 'vs-machine', label: 'Accessible voting system available', field: 'machine', ada: { cite: 'Help America Vote Act, 52 U.S.C. §21081(a)(3)(A) and (B)', expect: true }, mi: { cite: 'MCL 168.662(7)', expect: true },
            note: 'Michigan requires each polling place and early voting site to be accessible and to comply with the Voting Accessibility for the Elderly and Handicapped Act and the Help America Vote Act (MCL 168.662(7)).' },
          { id: 'vs-priv', label: 'Private and independent voting', field: 'privacy', ada: { cite: 'Help America Vote Act, 52 U.S.C. §21081(a)(3)(A); DOJ ADA Checklist for Polling Places', expect: true } }
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
          { id: 'tf-width', label: 'Clear width (36 in min)', field: 'width', ada: ada('403.5.1', { min: 36 }), mi: mi('403.5.1', { min: 36 }),
            note: 'Michigan: outdoors the route needs 48 in, except a portable ramp, which needs 36 in (A117.1 403.5.1 and 405.5).' }
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
          { id: 'et-entry', label: 'Entry width (32 in min at openings)', field: 'entry_width', ada: ada('404.2.3', { min: 32 }), mi: mi('404.2.2', { min: 32 }) },
          { id: 'et-aisle', label: 'Aisle width (36 in min)', field: 'aisle', ada: ada('403.5.1', { min: 36 }), mi: mi('403.5.1', { min: 36 }),
            note: 'Michigan: an exterior route leading to the tent needs 48 in (A117.1 403.5.1).' },
          { id: 'et-turn', label: 'Turning space', field: 'turning', ada: ada('304.3', { expect: true }), mi: mi('304.3', { expect: true }) },
          { id: 'et-floor', label: 'Floor surface', field: 'floor', ada: ada('302.1', { expect: true }), mi: mi('302.1', { expect: true }) },
          { id: 'et-counter', label: 'Service counter or table (36 in max)', field: 'counter', ada: ada('904.4.1', { max: 36 }), mi: mi('904.3.2', { max: 36 }) },
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
          { id: 'ep-width', label: 'Clear width (36 in min; Michigan 48 in outdoors)', field: 'clear_width', ada: ada('403.5.1', { min: 36 }), mi: mi('403.5.1', { min: 48 }),
            note: 'A117.1-2017 requires 48 in for exterior routes; 36 in within seating areas.' },
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
          { id: 'pt-count', label: 'At least 5% accessible (at least one)', kind: 'ratio', num: 'accessible', den: 'total', minPct: 5, ada: ada('213.2, Exception 3'), mi: { cite: '2021 MBC §1110.2, Exception 3', verify: true },
            note: 'Michigan: where single-user toilet rooms are clustered, at least 50% (at least one) must be accessible (MBC 1110.2, Exception 3). Whether that applies to a bank of portable units is up to the building official; the app checks the ADA 5%.' },
          { id: 'pt-route', label: 'On an accessible route', field: 'route', ada: ada('206.2.2 and 302.1', { expect: true }), mi: mi('302.1', { expect: true }) },
          { id: 'pt-level', label: 'Level entry', kind: 'levelChange', fields: ['level_change', 'beveled'], ada: ada('303.2 and 303.3'), mi: mi('303.2 and 303.3') },
          { id: 'pt-door', label: 'Door clear width (32 in min)', field: 'door', ada: ada('404.2.3', { min: 32 }), mi: mi('404.2.2', { min: 32 }) },
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

  // Michigan (ICC A117.1-2017) citations checked against the ICC Digital Codes text of Chapters 3, 4, 5, 6, 7 (703.2 and 703.3), 8 (802 and 805), 9 and 10, Oct 27, 2026.
  // 2021 MBC Chapter 11 citations checked against the UpCodes text, Oct 27, 2026.
  var MI_CONFIRMED = ['signage.sg-low', 'signage.sg-high', 'signage.sg-latch', 'signage.sg-clear', 'signage.sg-raised', 'signage.sg-braille',
    'bus_stop.bs-depth', 'bus_stop.bs-width', 'bus_stop.bs-slope', 'bus_stop.bs-route', 'signage.sg-finish',
    'route.rt-run', 'route.rt-cross', 'route.rt-width-mi-out', 'route.rt-width-mi-in', 'ramp.rp-run', 'ramp.rp-cross', 'ramp.rp-width', 'ramp.rp-rise', 'ramp.rp-land-top', 'ramp.rp-land-bot', 'ramp.rp-land-slope', 'ramp.rp-rails', 'ramp.rp-edge', 'protruding.po-protrude', 'protruding.po-head', 'door.dr-width', 'door.dr-thresh', 'door.dr-hw-ht', 'door.dr-hw-type', 'door.dr-force', 'door.dr-close', 'door.dr-pull-latch', 'door.dr-pull-depth', 'door.dr-push-depth', 'door.dr-other', 'operable.op-high', 'operable.op-low', 'operable.op-obst', 'operable.op-grasp', 'operable.op-force', 'curb_ramp.cr-run', 'curb_ramp.cr-cross', 'curb_ramp.cr-width', 'curb_ramp.cr-flare', 'curb_ramp.cr-counter', 'curb_ramp.cr-landing', 'curb_ramp.cr-flush', 'assembly.as-w1', 'assembly.as-w2', 'assembly.as-df', 'assembly.as-ds', 'assembly.as-comp', 'voting_station.vs-route', 'voting_station.vs-reach', 'temp_fix.tf-slope', 'temp_fix.tf-width', 'event_tent.et-entry', 'event_tent.et-aisle', 'event_tent.et-high', 'event_tent.et-low', 'event_path.ep-width', 'event_path.ep-run', 'event_path.ep-cross', 'portable_toilet.pt-door',
    'route.rt-level', 'route.rt-open', 'route.rt-surface', 'surface.sf-firm', 'surface.sf-damage', 'surface.sf-open', 'surface.sf-level', 'surface.sf-pile', 'surface.sf-secure', 'surface.sf-backing', 'surface.sf-edge', 'toilet_room.tr-turn', 'toilet_room.tr-turn-t', 'lavatory.lv-knee', 'lavatory.lv-cfs-w', 'lavatory.lv-cfs-d', 'voting_station.vs-cfs', 'voting_station.vs-knee', 'temp_fix.tf-edge', 'event_tent.et-level', 'event_tent.et-turn', 'event_tent.et-floor', 'event_path.ep-surf', 'event_path.ep-level', 'event_path.ep-open', 'portable_toilet.pt-route', 'portable_toilet.pt-level',
    'amusement_ride.ar-slope', 'boating.bt-gang', 'boating.bt-pier', 'boating.bt-route', 'counter.ct-height', 'counter.ct-knee', 'counter.ct-len-fwd', 'counter.ct-len-par', 'event_tent.et-counter', 'exercise.ex-cfs', 'fishing.fp-cfs', 'fishing.fp-edge', 'fishing.fp-rail', 'fishing.fp-turn', 'fountain.df-stand', 'fountain.df-wc', 'golf.gf-car', 'golf.gf-mini', 'lavatory.lv-faucet', 'lavatory.lv-mirror', 'lavatory.lv-pipes', 'lavatory.lv-rim', 'loading_zone.lz-aisle-l', 'loading_zone.lz-aisle-w', 'loading_zone.lz-clear', 'loading_zone.lz-marked', 'loading_zone.lz-pullup', 'loading_zone.lz-slope', 'parking.pk-aisle', 'parking.pk-marked', 'parking.pk-route', 'parking.pk-sign-ht', 'parking.pk-slope', 'parking.pk-van', 'parking.pk-van-clr', 'parking.pk-van-sign', 'parking.pk-width', 'picnic.pn-height', 'picnic.pn-knee', 'play_area.pa-elev', 'play_area.pa-ground', 'play_area.pa-gwidth', 'play_area.pa-impact', 'play_area.pa-ramp', 'play_area.pa-surf', 'play_area.pa-turn', 'play_component.pc-cfs', 'play_component.pc-entry', 'play_component.pc-knee', 'play_component.pc-route', 'play_component.pc-table', 'play_ramp.pr-rail', 'play_ramp.pr-rise', 'play_ramp.pr-slope-e', 'play_ramp.pr-slope-g', 'play_ramp.pr-width', 'play_ramp.pr-width-g', 'play_transfer.pt-d', 'play_transfer.pt-h-plat', 'play_transfer.pt-h-step', 'play_transfer.pt-sup', 'play_transfer.pt-w', 'pool_lift.lf-cap', 'pool_lift.lf-deck', 'pool_lift.lf-depth', 'pool_lift.lf-foot', 'pool_lift.lf-op', 'pool_lift.lf-seat', 'pool_lift.lf-sub', 'pool_lift.lf-width', 'pool_slope.ps-depth', 'pool_slope.ps-rails', 'pool_slope.ps-slope', 'portable_toilet.pt-grab', 'portable_toilet.pt-seat', 'portable_toilet.pt-turn', 'ramp.rp-rail-dia', 'ramp.rp-rail-ext', 'ramp.rp-rail-ht', 'stairs.st-open', 'stairs.st-rail-ht', 'stairs.st-rails', 'stairs.st-riser', 'stairs.st-riser-min', 'stairs.st-tread', 'stairs.st-uniform', 'toilet.wc-cl', 'toilet.wc-clr-d', 'toilet.wc-clr-w', 'toilet.wc-flush', 'toilet.wc-gb-ht', 'toilet.wc-rgb-len', 'toilet.wc-rgb-split', 'toilet.wc-seat', 'toilet.wc-sgb-len', 'toilet.wc-sgb-reach', 'toilet.wc-sgb-rear', 'toilet.wc-stall-d-floor', 'toilet.wc-stall-d-wall', 'toilet.wc-stall-w', 'toilet.wc-tp-front', 'toilet.wc-tp-ht', 'toilet_room.tr-swing', 'transfer_wall.tw-d', 'transfer_wall.tw-grab', 'transfer_wall.tw-h', 'transfer_wall.tw-l', 'urinal.ur-flush', 'urinal.ur-rim', 'voting_station.vs-height', 'work_surface.ws-height', 'work_surface.ws-knee'];
  RULES.elements.forEach(function (el) {
    el.checks.forEach(function (c) { if (c.mi && (MI_CONFIRMED.indexOf(el.id + '.' + c.id) >= 0 || /^2021 MBC/.test(c.mi.cite))) c.mi.verify = false; });
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = RULES;
  else root.DNEM_RULES = RULES;
})(this);
