import bpy, math, os
bpy.ops.wm.read_factory_settings(use_empty=True)
# Procedural "bar stool": cylinder seat + 4 legs, flat-colour material, then glTF export.
bpy.ops.mesh.primitive_cylinder_add(radius=0.18, depth=0.05, location=(0, 0, 0.7))
seat = bpy.context.object
seat.name = "Seat"
for i in range(4):
    a = i * math.pi / 2 + math.pi / 4
    bpy.ops.mesh.primitive_cylinder_add(radius=0.015, depth=0.68,
                                        location=(0.13 * math.cos(a), 0.13 * math.sin(a), 0.34))
mat = bpy.data.materials.new("Wood")
mat.diffuse_color = (0.45, 0.26, 0.12, 1)
for o in bpy.data.objects:
    if o.type == 'MESH':
        o.data.materials.append(mat)
out = os.path.join(os.path.dirname(os.path.abspath(__file__)) if '__file__' in globals() else os.getcwd(), "stool.glb")
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB')
print("GLTF_EXPORT_OK", out)
