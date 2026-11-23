# Blender scene for the branch hallway background (one-point corridor).
# Renders the corridor, wide enough for fill mode, in two variants (door
# closed / open) and writes the projected 2D positions of the things the
# game animates on top (lamps, drips, sign, door).
#   blender -b -P tools/blender/hallway.py -- OUTDIR [samples]
import bpy, bmesh, math, json, sys, os
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else '/tmp/hall'
SAMPLES = int(argv[1]) if len(argv) > 1 else 160
os.makedirs(OUT, exist_ok=True)

GW, GH, MARGIN = 320, 180, 48           # game screen and extra width per side
RW = GW + MARGIN * 2
F_PX = 147.9                            # focal length in game pixels
CAM_Z = 2.15
HORIZON = 74                            # screen y of the vanishing point
WID, HEI, LEN = 6.5, 3.65, 20.0
HX = WID / 2

# ---------------------------------------------------------------- reset
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.samples = SAMPLES
sc.cycles.use_denoising = False   # this build has no denoiser: render at 2x and downscale
sc.cycles.max_bounces = 6
sc.render.resolution_x, sc.render.resolution_y = RW, GH
sc.render.resolution_percentage = 200
sc.render.film_transparent = False
sc.view_settings.view_transform = 'Filmic' if 'Filmic' in [i.identifier for i in sc.view_settings.bl_rna.properties['view_transform'].enum_items] else 'Standard'
sc.view_settings.look = 'None'
sc.view_settings.exposure = 0.6

world = bpy.data.worlds.new('W'); sc.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (0.006, 0.008, 0.012, 1)
world.node_tree.nodes['Background'].inputs[1].default_value = 1.0

# ---------------------------------------------------------------- materials
def mat(name, base, rough=0.6, metal=0.0, emit=None, estr=0.0, noise=None):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*base, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit:
        b.inputs['Emission Color'].default_value = (*emit, 1)
        b.inputs['Emission Strength'].default_value = estr
    if noise:
        # grime / rust: a noise texture mixes a second colour in, more of it lower down
        col2, scale, amount = noise
        tex = nt.nodes.new('ShaderNodeTexNoise'); tex.inputs['Scale'].default_value = scale; tex.inputs['Detail'].default_value = 8
        ramp = nt.nodes.new('ShaderNodeValToRGB')
        ramp.color_ramp.elements[0].position = 0.5 - amount * 0.25; ramp.color_ramp.elements[1].position = 0.75
        mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'
        mix.inputs[6].default_value = (*base, 1); mix.inputs[7].default_value = (*col2, 1)
        nt.links.new(tex.outputs['Fac'], ramp.inputs['Fac'])
        nt.links.new(ramp.outputs['Color'], mix.inputs['Factor'])
        nt.links.new(mix.outputs[2], b.inputs['Base Color'])
        bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.25
        nt.links.new(tex.outputs['Fac'], bump.inputs['Height'])
        nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m

M_WALL = mat('wall', (0.05, 0.07, 0.085), 0.7, 0.3, noise=((0.1, 0.045, 0.02), 1.6, 0.55))
M_WAIN = mat('wainscot', (0.035, 0.045, 0.055), 0.6, 0.5, noise=((0.08, 0.035, 0.015), 2.5, 0.7))
M_SEAM = mat('seam', (0.01, 0.012, 0.014), 0.8)
M_FLOOR = mat('floor', (0.045, 0.05, 0.05), 0.55, 0.7, noise=((0.02, 0.022, 0.024), 14.0, 0.8))
def wet(m, scale=0.45, cut=0.5):
    # large, irregular wet patches: darker and almost mirror-smooth
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    tex = nt.nodes.new('ShaderNodeTexNoise'); tex.inputs['Scale'].default_value = scale; tex.inputs['Detail'].default_value = 4
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = cut; ramp.color_ramp.elements[1].position = cut + 0.03
    ramp.color_ramp.elements[0].color = (0.55, 0.55, 0.55, 1); ramp.color_ramp.elements[1].color = (0.04, 0.04, 0.04, 1)
    nt.links.new(tex.outputs['Fac'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], b.inputs['Roughness'])
wet(M_FLOOR)
M_GRATE = mat('grate', (0.02, 0.022, 0.024), 0.5, 0.8)
M_CEIL = mat('ceil', (0.03, 0.035, 0.04), 0.8, 0.2, noise=((0.015, 0.012, 0.01), 1.5, 0.8))
M_PIPE = mat('pipe', (0.09, 0.12, 0.13), 0.35, 0.8, noise=((0.14, 0.06, 0.02), 12.0, 0.7))
M_RAIL = mat('rail', (0.12, 0.14, 0.15), 0.3, 0.9)
M_WATER = mat('water', (0.01, 0.015, 0.02), 0.03, 0.0)
M_DOOR = mat('door', (0.06, 0.08, 0.09), 0.45, 0.8, noise=((0.1, 0.045, 0.02), 3.0, 0.5))
M_FRAME = mat('frame', (0.12, 0.14, 0.15), 0.4, 0.8)
M_BLACK = mat('void', (0.0, 0.0, 0.0), 1.0)
M_LAMPBOX = mat('lampbox', (0.08, 0.04, 0.03), 0.5, 0.4)
M_LAMP = mat('lamp', (0.4, 0.15, 0.05), 0.4, 0.0, emit=(1.0, 0.35, 0.1), estr=6.0)
M_SIGN = mat('sign', (0.02, 0.05, 0.035), 0.5, 0.0, emit=(0.2, 0.6, 0.35), estr=0.12)
M_SIGNPLATE = mat('signplate', (0.03, 0.05, 0.04), 0.5, 0.3)
M_FIX = mat('fixture', (0.06, 0.065, 0.07), 0.5, 0.6)
M_TUBE = mat('tube', (0.5, 0.55, 0.52), 0.3, 0.0)

def box(name, loc, size, m, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rot)
    o = bpy.context.object; o.name = name; o.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)   # textures in real metres
    o.data.materials.append(m); return o
def cyl(name, loc, r, length, m, axis='Y'):
    rot = {'Y': (math.pi / 2, 0, 0), 'X': (0, math.pi / 2, 0), 'Z': (0, 0, 0)}[axis]
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=length, location=loc, rotation=rot, vertices=20)
    o = bpy.context.object; o.name = name; o.data.materials.append(m)
    bpy.ops.object.shade_smooth(); return o

# ---------------------------------------------------------------- shell
box('floor', (0, LEN / 2, -0.05), (WID, LEN, 0.1), M_FLOOR)
box('ceil', (0, LEN / 2, HEI + 0.05), (WID, LEN, 0.1), M_CEIL)
D0, D1, DH = 3.55, 4.85, 2.3          # the break-room door on the right wall
def spans(s):
    # the right wall is split round the doorway
    return [(0, LEN)] if s < 0 else [(0, D0 - 0.12), (D1 + 0.12, LEN)]
for s in (-1, 1):
    for (a0, a1) in spans(s):
        L, C = a1 - a0, (a0 + a1) / 2
        box('wall', (s * (HX + 0.05), C, HEI / 2), (0.1, L, HEI), M_WALL)
        box('wain', (s * (HX - 0.02), C, 0.55), (0.04, L, 1.1), M_WAIN)
        cyl('rail', (s * (HX - 0.08), C, 1.12), 0.035, L, M_RAIL)
        box('skirt', (s * (HX - 0.06), C, 0.06), (0.06, L, 0.12), M_RAIL)
    if s > 0:
        box('wall', (HX + 0.05, (D0 + D1) / 2, (DH + 0.12 + HEI) / 2), (0.1, D1 - D0 + 0.24, HEI - DH - 0.12), M_WALL)
    # vertical panel seams and horizontal joints
    y = 0.6
    while y < LEN:
        if not (s > 0 and D0 - 0.2 < y < D1 + 0.2):
            box('seam', (s * (HX - 0.045), y, HEI / 2), (0.02, 0.05, HEI), M_SEAM)
        y += 1.9
    box('joint', (s * (HX - 0.045), LEN / 2, 2.45), (0.02, LEN, 0.04), M_SEAM)
# far end: a doorway into darkness, a red emergency light behind it
# the end wall, with a real doorway in the middle
for sx in (-1, 1):
    box('end', (sx * (1.1 + (HX - 1.1) / 2), LEN + 0.05, HEI / 2), (HX - 1.1, 0.1, HEI), M_WALL)
box('endtop', (0, LEN + 0.05, (2.5 + HEI) / 2), (2.2, 0.1, HEI - 2.5), M_WALL)
box('endfloor', (0, LEN + 2.5, -0.05), (3, 5, 0.1), M_FLOOR)
box('endframeL', (-1.15, LEN - 0.06, 1.3), (0.12, 0.06, 2.6), M_FRAME)
box('endframeR', (1.15, LEN - 0.06, 1.3), (0.12, 0.06, 2.6), M_FRAME)
box('endframeT', (0, LEN - 0.06, 2.58), (2.42, 0.06, 0.12), M_FRAME)
bpy.ops.object.light_add(type='POINT', location=(0, LEN + 1.2, 0.6))
red = bpy.context.object; red.data.energy = 260; red.data.color = (1.0, 0.12, 0.08); red.data.shadow_soft_size = 0.5
box('redwall', (0, LEN + 2.5, 1.5), (3, 0.1, 3), mat('redwall', (0.05, 0.03, 0.03), 0.8))

# floor plates and a central drainage grating
y = 0.0
while y < LEN:
    box('plateseam', (0, y, 0.001), (WID, 0.03, 0.004), M_SEAM)
    y += 1.5
for x in (-1.0, 1.0):
    box('plateseamx', (x, LEN / 2, 0.001), (0.03, LEN, 0.004), M_SEAM)
y = 0.3
while y < LEN:
    box('grate', (0, y, 0.004), (0.7, 0.04, 0.006), M_GRATE)
    y += 0.12

# ceiling pipes with brackets, and broken fluorescent fixtures
pipes = [(-2.7, 3.35, 0.13), (-2.25, 3.42, 0.09), (2.7, 3.35, 0.13), (2.3, 3.4, 0.08)]
for (x, z, r) in pipes:
    cyl('pipe', (x, LEN / 2, z), r, LEN, M_PIPE)
    y = 1.0
    while y < LEN:
        box('bracket', (x, y, (z + HEI) / 2 + 0.05), (0.05, 0.06, HEI - z), M_FIX)
        y += 2.5
for (yy, broken) in [(3.0, True), (7.5, False), (12.0, True), (16.5, False)]:
    box('fixture', (0, yy, HEI - 0.06), (0.35, 1.4, 0.08), M_FIX)
    box('tube', (0, yy, HEI - 0.11), (0.08, 1.25 if not broken else 0.6, 0.03), M_TUBE)

# emergency lamps on the walls
LAMPS = [(-HX + 0.08, 3.2, 2.85), (-HX + 0.08, 8.4, 2.7), (HX - 0.08, 10.5, 2.65)]
for (x, yy, z) in LAMPS:
    s = -1 if x < 0 else 1
    box('lampbox', (x, yy, z), (0.12, 0.34, 0.18), M_LAMPBOX)
    box('lamp', (x - s * 0.065, yy, z - 0.02), (0.02, 0.26, 0.1), M_LAMP)
    bpy.ops.object.light_add(type='POINT', location=(x - s * 0.35, yy, z - 0.1))
    l = bpy.context.object; l.data.energy = 25; l.data.color = (1.0, 0.42, 0.15); l.data.shadow_soft_size = 0.2

# soft cold fill so the geometry reads (the game darkens the scene itself)
bpy.ops.object.light_add(type='AREA', location=(0, 5, HEI - 0.2))
fill = bpy.context.object; fill.data.energy = 120; fill.data.size = 4; fill.data.color = (0.55, 0.7, 0.85)
bpy.ops.object.light_add(type='AREA', location=(0, 12, HEI - 0.2))
fill2 = bpy.context.object; fill2.data.energy = 60; fill2.data.size = 3; fill2.data.color = (0.55, 0.7, 0.85)

# door to the break room on the right wall, and its sign
DCY = (D0 + D1) / 2
box('doorframeA', (HX - 0.06, D0 - 0.06, DH / 2 + 0.06), (0.1, 0.12, DH + 0.12), M_FRAME)
box('doorframeB', (HX - 0.06, D1 + 0.06, DH / 2 + 0.06), (0.1, 0.12, DH + 0.12), M_FRAME)
box('doorframeT', (HX - 0.06, DCY, DH + 0.1), (0.1, D1 - D0 + 0.24, 0.12), M_FRAME)
door = box('door', (HX - 0.04, DCY, DH / 2), (0.05, D1 - D0, DH), M_DOOR)
handle = cyl('handle', (HX - 0.1, D1 - 0.18, 1.05), 0.025, 0.18, M_RAIL, 'Z')
gap = box('doorvoid', (HX - 0.005, DCY, DH / 2), (0.01, D1 - D0, DH), M_BLACK)
box('signplate', (HX - 0.03, DCY, DH + 0.55), (0.04, 1.5, 0.55), M_SIGNPLATE)
box('signglow', (HX - 0.055, DCY, DH + 0.55), (0.01, 1.35, 0.42), M_SIGN)
# light spilling from the break room when the door is open
bpy.ops.object.light_add(type='AREA', location=(HX + 1.0, DCY, 2.2))
spill = bpy.context.object; spill.data.energy = 0; spill.data.size = 1.0; spill.data.color = (0.75, 0.9, 0.85)
spill.rotation_euler = (0, -math.pi / 2, 0)
box('roomback', (HX + 2.5, DCY, 1.5), (0.1, 3, 3), mat('roomback', (0.03, 0.03, 0.028), 0.8))
box('roomfloor', (HX + 1.3, DCY, -0.05), (2.6, 3, 0.1), M_FLOOR)

# haze: a mist pass blended in by the compositor (clean, no volume noise)
vl = sc.view_layers[0]; vl.use_pass_mist = True
world.mist_settings.start = 2.0; world.mist_settings.depth = 22.0; world.mist_settings.falloff = 'QUADRATIC'
sc.use_nodes = True
ct = sc.node_tree
for n in list(ct.nodes): ct.nodes.remove(n)
rl = ct.nodes.new('CompositorNodeRLayers'); comp = ct.nodes.new('CompositorNodeComposite')
mul = ct.nodes.new('CompositorNodeMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = 0.55
mix = ct.nodes.new('CompositorNodeMixRGB'); mix.inputs[2].default_value = (0.02, 0.028, 0.036, 1)
ct.links.new(rl.outputs['Mist'], mul.inputs[0]); ct.links.new(mul.outputs[0], mix.inputs[0])
ct.links.new(rl.outputs['Image'], mix.inputs[1]); ct.links.new(mix.outputs[0], comp.inputs['Image'])

# ---------------------------------------------------------------- camera
bpy.ops.object.camera_add(location=(0, 0, CAM_Z), rotation=(math.pi / 2, 0, 0))
cam = bpy.context.object; sc.camera = cam
cam.data.sensor_fit = 'HORIZONTAL'; cam.data.sensor_width = 36
cam.data.lens = F_PX * 36 / RW
cam.data.shift_y = -(GH / 2 - HORIZON) / RW
cam.data.clip_end = 100

def proj(p):
    v = world_to_camera_view(sc, cam, Vector(p))
    return [round(v.x * RW - MARGIN, 1), round((1 - v.y) * GH, 1)]

info = {
    'lamps': [proj((x - (-1 if x < 0 else 1) * 0.07, yy, z)) for (x, yy, z) in LAMPS],
    'drips': [[proj((x, yy, z - r)), proj((x, yy, 0.0))] for (x, z, r) in [pipes[1], pipes[3], pipes[0]] for yy in [2.6 if x < 0 else 5.2]],
    'sign': proj((HX - 0.06, DCY, DH + 0.55)), 'signW': proj((HX - 0.06, D0 + 0.08, DH + 0.55))[0] - proj((HX - 0.06, D1 - 0.08, DH + 0.55))[0],
    'door': [proj((HX, D0, 0)), proj((HX, D1, 0)), proj((HX, D1, DH)), proj((HX, D0, DH))],
    'floorY': {str(d): proj((0, d, 0))[1] for d in [3, 4, 5, 7, 10, 20]},
    'end': proj((0, LEN, 1.25)),
}
json.dump(info, open(os.path.join(OUT, 'hallway.json'), 'w'), indent=1)

for variant in ('closed', 'open'):
    is_open = variant == 'open'
    door.hide_render = is_open; handle.hide_render = is_open
    spill.data.energy = 22 if is_open else 0
    gap.hide_render = True
    sc.render.filepath = os.path.join(OUT, f'hallway_{variant}.png')
    bpy.ops.render.render(write_still=True)
print('DONE', json.dumps(info))
