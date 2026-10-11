#!/usr/bin/env python3
"""Sold plots layer — extraction half of scripts/build-sold-plots.ts.

Reads the local research stores and writes slim, PII-free intermediate JSON
into <work>/ . The TS half joins, places and writes data/sold-plots/.
Reads the Intel kit `deals` table only, and only the columns listed in KIT_COLS
(never sellers / buyers / any party table).

  python3 -I scripts/sold-plots/extract.py <work-dir>
"""
import csv, gzip, json, math, os, random, sqlite3, sys, glob
from pyproj import Transformer
from shapely.geometry import shape, Point, Polygon

HOME = os.path.expanduser('~')
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RAW = f'{REPO}/docs/research/data-dubai/raw'
WORK = sys.argv[1]
os.makedirs(WORK, exist_ok=True)
KIT_COLS = 'txn_date,municipality_number,area_name,master_project,property_type,procedure_name,amount,size_sqm'
LAND_TYPES = ('Land', 'Residential Plots', 'Commercial Plots', 'Mixed Use Land')


def out(name, obj):
    with open(f'{WORK}/{name}.json', 'w') as f:
        json.dump(obj, f, separators=(',', ':'))
    print(f'{name}.json', os.path.getsize(f'{WORK}/{name}.json'))


def ro(path):
    return sqlite3.connect(f'file:{path}?mode=ro', uri=True)


def centroid(geom):
    c = shape(geom).centroid
    return [round(c.x, 6), round(c.y, 6)]


def read_nl(path):
    for l in open(path):
        l = l.strip().lstrip('\x1e')
        if l:
            yield json.loads(l)


# ---- registry + projects -------------------------------------------------
reg = json.load(open(f'{RAW}/land_registry.json'))
def num(v):
    # the open-data dump stores ids as strings with a ".00" suffix
    return None if v in (None, '') else str(int(float(v)))


out('registry', [{'pid': num(r['parcel_id']), 'area': r['area_name_en'], 'land': r['land_number'],
                  'proj': num(r['project_id']), 'type': r['land_type_en'], 'm2': float(r['actual_area'] or 0) or None,
                  'master': r['master_project_en'], 'pname': r['project_name_en']}
                 for r in reg])
del reg
devs = {d['developer_id']: d for d in json.load(open(f'{RAW}/developers.json'))}
projs = {}
for p in json.load(open(f'{RAW}/projects.json')):
    d = devs.get(p['developer_id']) or {}
    projs[p['project_id']] = {'status': p['project_status'], 'pct': p['percent_completed'],
                              'cancel': p['cancellation_date'], 'done': p['completion_date'],
                              'start': p['project_start_date'], 'end': p['project_end_date'],
                              'dev': d.get('developer_name_en'), 'escrow': p['escrow_agent_name'],
                              'asof': (p['load_timestamp'] or '')[:10]}
out('projects', projs)

# ---- DDA centroids -------------------------------------------------------
idx = json.load(open(f'{REPO}/data/dda-plot-index.json'))
byfile = {}
for pid, v in idx.items():
    byfile.setdefault(v['file'], set()).add(pid)
dda = {}
for fn, pids in byfile.items():
    for ft in json.load(open(f'{REPO}/data/layers/dda/{fn}.geojson'))['features']:
        pid = str(ft['properties']['PLOT_NUMBER'])
        if pid in pids:
            dda[pid] = centroid(ft['geometry'])
out('dda', {'cent': dda, 'meta': {p: [v['projectName'], v['areaSqft'], v['landUse']] for p, v in idx.items()}})

# ---- master-plan polygons / harvested pins / bridges ---------------------
mp, harv, bridge = {}, {}, {}   # key -> {...}
for ft in read_nl(f'{REPO}/data/tiles/masterplan-plots.geojson.nl'):
    p = ft['properties']
    mp[p['plotNumber']] = {'c': centroid(ft['geometry']), 'comm': p['community'], 'mun': p['mun'], 'dld': p['dld'],
                           'm2': p['areaSqm'], 'far': p['far'] or None, 'gfa': p['gfaSqft'] or None,
                           'proj': p['projectName'], 'land': p['mainLandUse'], 'poly': ft['geometry']}
for comm in ('jvc', 'jvt'):
    for r in csv.DictReader(open(f'{HOME}/{comm}-masterplan/coords.csv')):
        harv[r['plot_no']] = {'c': [float(r['lng']), float(r['lat'])], 'comm': comm, 'method': r['method']}
    for r in csv.DictReader(open(f'{HOME}/{comm}-masterplan/plot_bridge.csv')):
        if r['municipality_no']:
            bridge[r['municipality_no']] = r['plot_no']
ds = f'{HOME}/dubai-south-masterplan/out'
for ft in json.load(open(f'{ds}/ds_plots.geojson'))['features']:
    p = ft['properties']
    mp[p['plot_no']] = {'c': centroid(ft['geometry']), 'comm': 'ds', 'mun': '', 'dld': p['dld_land_numbers'],
                        'm2': float(p['plot_area_m2'] or 0) or None, 'far': None, 'gfa': None,
                        'proj': p['dld_project'], 'land': p['dld_land_type'], 'poly': ft['geometry']}
dsm = {}
for r in csv.DictReader(open(f'{ds}/ds_plot_master.csv')):
    dsm[r['plot_no']] = r
    if r['lat'] and r['plot_no'] not in mp:
        harv[r['plot_no']] = {'c': [float(r['lng']), float(r['lat'])], 'comm': 'ds', 'method': r['geometry_provenance']}
    if r['plot_no'] in mp:
        mp[r['plot_no']]['far'] = float(r['far']) if r['far'] else None
        mp[r['plot_no']]['gfa'] = float(r['gfa_sqft']) if r['gfa_sqft'] else None
        mp[r['plot_no']]['far_src'] = r['far_provenance']
mh = f'{HOME}/meydan-horizon-masterplan/out'
for ft in json.load(open(f'{mh}/mh_plots.geojson'))['features']:
    p = ft['properties']
    mp['MH:' + p['parcel_id']] = {'c': centroid(ft['geometry']), 'comm': 'mh', 'mun': p['parcel_id'], 'dld': p['land_number'],
                                  'm2': float(p['registry_area_sqm'] or 0) or None, 'far': None, 'gfa': None,
                                  'proj': p['project'], 'land': p['landuse']}
mhpin = {r['plot_key']: r for r in csv.DictReader(open(f'{mh}/pins.csv'))}
out('geo', {'mp': {k: {x: y for x, y in v.items() if x != 'poly'} for k, v in mp.items()}, 'harv': harv, 'bridge': bridge,
            'mhpin': {k: {'pid': v['parcel_id'], 'c': [float(v['lng']), float(v['lat'])]} for k, v in mhpin.items()}})

# ---- sales ---------------------------------------------------------------
# row: {s: source, k: key fields, d: date, p: AED int, a: plot sqft, w: seller type, g: capital gain %, f: file/proc}
sales = []
d = ro(f'{HOME}/Intel/dxb/dxb_master.db')
for loc, trunc, dt, plot, price, area, who, cg in d.execute(
        "select location,location_truncated,date_iso,plot_no,price_aed,area_sqft,seller_type,capital_gain_pct "
        "from transactions where ptype='Plot'"):
    sales.append({'s': 'dxb', 'loc': loc, 'trunc': trunc, 'plot': plot, 'd': dt, 'p': price, 'a': area, 'w': who, 'g': cg})
for comm in ('jvc', 'jvt'):
    c = ro(f'{HOME}/{comm}-masterplan/{comm}_master.db')
    for plot, dt, price, area, who, cg in c.execute(
            'select plot_no,date_iso,price_aed,plot_area_sqft,sold_by,capital_gain_pct from transactions'):
        sales.append({'s': comm, 'plot': plot, 'd': dt, 'p': price, 'a': area, 'w': who, 'g': cg})
for r in csv.DictReader(open(f'{ds}/ds_plot_transactions.csv')):
    sales.append({'s': 'ds', 'plot': r['plot_no'], 'd': r['date_iso'], 'p': int(float(r['price_aed'])),
                  'a': float(r['plot_area_sqft'] or 0) or None, 'w': r['sold_by'], 'g': r['capital_gain_pct'] or None})
for r in csv.DictReader(open(f'{mh}/mh_plot_transactions.csv')):
    sales.append({'s': 'mh', 'plot': r['community'] + '|' + r['plot_no'], 'd': r['date_iso'], 'p': int(float(r['price_aed'])),
                  'a': float(r['plot_area_sqft'] or 0) or None, 'w': r['sold_by'], 'g': r['capital_gain_pct'] or None})
k = ro(f'{HOME}/Intel/intel/kit/db.sqlite')
q = ','.join('?' * len(LAND_TYPES))
kit = [dict(zip(KIT_COLS.split(','), r)) for r in k.execute(
    f'select {KIT_COLS} from deals where municipality_number is not null and property_type in ({q})', LAND_TYPES)]
out('sales', sales)
out('kit', kit)

# ---- D5 precision sample: 50 harvested JVC pins vs master-plan polygons ---
to_m = Transformer.from_crs(4326, 3997, always_xy=True)
def prj(coords):
    return [to_m.transform(x, y) for x, y in coords]
cand = [c for c, h in harv.items() if h['comm'] == 'jvc' and c in mp]
random.Random(20261011).shuffle(cand)
rows = []
for code in cand[:50]:
    g = shape(mp[code]['poly'])
    poly = Polygon(prj(g.exterior.coords))
    pt = Point(*to_m.transform(*harv[code]['c']))
    rows.append({'plot': code, 'to_edge_m': round(poly.distance(pt), 1), 'to_centroid_m': round(poly.centroid.distance(pt), 1)})
out('precision', {'jvc_candidates': len(cand), 'rows': rows})
