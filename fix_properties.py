import os
import re

def update_properties_page():
    path = "/home/midhun/works/hms/src/app/staff/properties/page.tsx"
    with open(path, "r") as f:
        content = f.read()

    # 1. Replace initialization and load
    init_pattern = re.compile(r"// Load from localStorage on mount.*?}, \[\]\);.*?// Save to localStorage when room overrides change.*?}, \[roomOverrides\]\);", re.DOTALL)
    
    new_init = """  // Load from API on mount
  useEffect(() => {
    fetch('/api/v1-properties?limit=100').then(res => res.json()).then(data => {
      if (data && data.docs) {
        setProperties(data.docs);
        if (data.docs.length > 0 && selectedPropertyId === 1) {
            setSelectedPropertyId(data.docs[0].id);
        }
      }
    }).catch(e => console.error(e));
    
    fetch('/api/v1-room-overrides?limit=1000').then(res => res.json()).then(data => {
      if (data && data.docs) {
        const overrides: any = {};
        data.docs.forEach((doc: any) => {
          overrides[doc.overrideKey] = doc;
        });
        setRoomOverrides(overrides);
      }
    }).catch(e => console.error(e));
  }, []);"""

    content = init_pattern.sub(new_init, content)

    # 2. Replace handleAddProperty
    add_pattern = re.compile(r"const handleAddProperty = \(\) => \{.*?setTimeout\(\(\) => \{.*?\}, 4000\);\n  \};", re.DOTALL)
    new_add = """  const handleAddProperty = async () => {
    if (!newProperty.name || !newProperty.location) return;
    
    const addedProperty = {
      name: newProperty.name,
      location: newProperty.location,
      rooms: newProperty.roomsPerFloor.reduce((acc, curr) => acc + (parseInt(curr) || 0), 0),
      floors: parseInt(newProperty.floors) || 1,
      roomsPerFloor: newProperty.roomsPerFloor.map(v => parseInt(v) || 0),
      isCustomBedsPerFloor: newProperty.isCustomBedsPerFloor,
      bedsPerFloor: newProperty.bedsPerFloor.map(v => parseInt(v) || 2),
      beds: parseInt(newProperty.beds) || 2,
      occupancy: '0%',
      status: 'Operational',
      images: newProperty.images
    };
    
    try {
      const res = await fetch('/api/v1-properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addedProperty)
      });
      const data = await res.json();
      if (!data.doc) throw new Error("Failed to create property");
      
      setProperties([...properties, data.doc]);
      setIsAddPropertyModalOpen(false);
      setNewProperty({ name: '', location: '', rooms: '', floors: '1', beds: '2', roomsPerFloor: ['0'], isCustomBedsPerFloor: false, bedsPerFloor: ['2'], images: [] });
      
      setSuccessMessage(`Property "${data.doc.name}" added successfully!`);
      setSelectedPropertyId(data.doc.id);
      setSelectedFloor(1);
      
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (e) { console.error(e); }
  };"""
    content = add_pattern.sub(new_add, content)

    # 3. Replace confirmDeleteProperty
    del_pattern = re.compile(r"const confirmDeleteProperty = \(\) => \{.*?setTimeout\(\(\) => \{.*?\}, 4000\);\n  \};", re.DOTALL)
    new_del = """  const confirmDeleteProperty = async () => {
    if (propertyToDelete === null) return;
    
    const property = properties.find(p => p.id === propertyToDelete);
    if (!property) {
      setPropertyToDelete(null);
      return;
    }
    
    try {
      await fetch(`/api/v1-properties/${propertyToDelete}`, { method: 'DELETE' });
      const updatedProperties = properties.filter(p => p.id !== propertyToDelete);
      setProperties(updatedProperties);
      setSuccessMessage(`Property "${property.name}" deleted successfully!`);
      
      if (selectedPropertyId === propertyToDelete) {
        setSelectedPropertyId(updatedProperties[0]?.id || 0);
        setSelectedFloor(1);
      }
      
      setPropertyToDelete(null);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (e) { console.error(e); }
  };"""
    content = del_pattern.sub(new_del, content)

    # 4. Replace handleUpdateProperty
    update_pattern = re.compile(r"const handleUpdateProperty = \(\) => \{.*?setTimeout\(\(\) => \{.*?\}, 4000\);\n  \};", re.DOTALL)
    new_update = """  const handleUpdateProperty = async () => {
    if (!editPropertyForm.name || !editPropertyForm.location) return;
    
    const updatedPropertyData = {
      name: editPropertyForm.name,
      location: editPropertyForm.location,
      rooms: editPropertyForm.roomsPerFloor.reduce((acc, curr) => acc + (parseInt(curr) || 0), 0),
      floors: parseInt(editPropertyForm.floors) || 1,
      roomsPerFloor: editPropertyForm.roomsPerFloor.map(v => parseInt(v) || 0),
      isCustomBedsPerFloor: editPropertyForm.isCustomBedsPerFloor,
      bedsPerFloor: editPropertyForm.bedsPerFloor.map(v => parseInt(v) || 2),
      beds: parseInt(editPropertyForm.beds) || 2,
      images: editPropertyForm.images
    };
    
    try {
      const res = await fetch(`/api/v1-properties/${editingPropertyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPropertyData)
      });
      const data = await res.json();
      
      const updatedProperties = properties.map(p => p.id === editingPropertyId ? data.doc : p);
      setProperties(updatedProperties);
      setEditingPropertyId(null);
      setSuccessMessage(`Property "${data.doc.name}" updated successfully!`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (e) { console.error(e); }
  };"""
    content = update_pattern.sub(new_update, content)

    # 5. Fix students localstorage in properties
    content = content.replace("localStorage.getItem('hms_students')", "null /* Fetch not implemented for student search here yet, handled below */")
    student_effect_pattern = re.compile(r"// Load real students from localStorage.*?useEffect\(\(\) => \{.*?\}, \[\]\);", re.DOTALL)
    new_student_effect = """  // Load real students from API
  useEffect(() => {
    fetch('/api/v1-students?limit=1000').then(res => res.json()).then(data => {
      if (data && data.docs) {
        setAvailableStudents(data.docs);
      }
    }).catch(e => console.error(e));
  }, []);"""
    content = student_effect_pattern.sub(new_student_effect, content)

    # Fix save room edits
    room_save_pattern = re.compile(r"const handleSaveRoomEdit = \(\) => \{.*?setActiveSearchBed\(null\);\n  \};", re.DOTALL)
    new_room_save = """  const handleSaveRoomEdit = async () => {
    if (!selectedRoom) return;
    if (editRoomData.freeBeds < 0 || editRoomData.filledBeds < 0 || editRoomData.freeBeds > editRoomData.beds || editRoomData.filledBeds > editRoomData.beds) {
      return;
    }
    
    const overrideKey = `${selectedPropertyId}-${selectedRoom.roomNum}`;
    
    const overrideData = {
      overrideKey,
      status: editRoomData.status,
      beds: editRoomData.beds,
      freeBeds: editRoomData.freeBeds,
      filledBeds: editRoomData.filledBeds,
      bedStatuses: editRoomData.bedStatuses,
      bedOccupants: editRoomData.bedOccupants,
      bedImages: editRoomData.bedImages,
      bedDescriptions: editRoomData.bedDescriptions,
      roomPrice: editRoomData.roomPrice,
      roomFacilitiesList: editRoomData.roomFacilitiesList,
      roomFacilitiesImages: editRoomData.roomFacilitiesImages,
      roomFacilitiesDescription: editRoomData.roomFacilitiesDescription,
      roomFacilitiesDescriptions: editRoomData.roomFacilitiesDescriptions
    };
    
    try {
      // Find if override exists
      const currentOverride = roomOverrides[overrideKey];
      
      if (currentOverride && currentOverride.id) {
         await fetch(`/api/v1-room-overrides/${currentOverride.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(overrideData)
         });
      } else {
         const res = await fetch(`/api/v1-room-overrides`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(overrideData)
         });
         const data = await res.json();
         if (data.doc) overrideData.id = data.doc.id;
      }
      
      setRoomOverrides(prev => ({
        ...prev,
        [overrideKey]: overrideData
      }));
    } catch(e) { console.error(e); }
    
    // We update students on backend inside a loop (simplified)
    const originalOccupants = selectedRoom.bedOccupants || [];
    const newOccupants = editRoomData.bedOccupants || [];
    const propName = selectedProperty?.name;
    const roomNumStr = selectedRoom.roomNum;

    const promises = [];
    
    // Unassign students
    originalOccupants.forEach(oldId => {
       if (oldId && !newOccupants.some(nId => nId && nId.toString() === oldId.toString())) {
           promises.push(fetch(`/api/v1-students/${oldId}`, {
               method: 'PATCH',
               headers: {'Content-Type': 'application/json'},
               body: JSON.stringify({ room: 'Unassigned', property: '' })
           }));
       }
    });

    // Assign students
    newOccupants.forEach((newId, idx) => {
       if (newId) {
           const bedLabel = String.fromCharCode(65 + idx);
           const roomStr = `Room ${roomNumStr} - Bed ${bedLabel}`;
           promises.push(fetch(`/api/v1-students/${newId}`, {
               method: 'PATCH',
               headers: {'Content-Type': 'application/json'},
               body: JSON.stringify({ room: roomStr, property: propName, status: 'Active' })
           }));
       }
    });
    
    await Promise.all(promises);
    
    // Refresh students
    fetch('/api/v1-students?limit=1000').then(res => res.json()).then(data => {
      if (data && data.docs) setAvailableStudents(data.docs);
    });

    setSelectedRoom({
      ...selectedRoom,
      ...overrideData
    });
    
    setIsEditingRoom(false);
    setActiveSearchBed(null);
  };"""
    content = room_save_pattern.sub(new_room_save, content)
    
    # State type for selectedPropertyId (sometimes it's a string from payload)
    content = content.replace("const [selectedPropertyId, setSelectedPropertyId] = useState(1);", "const [selectedPropertyId, setSelectedPropertyId] = useState<any>(1);")
    content = content.replace("const [editingPropertyId, setEditingPropertyId] = useState<number | null>(null);", "const [editingPropertyId, setEditingPropertyId] = useState<any>(null);")
    content = content.replace("const [propertyToDelete, setPropertyToDelete] = useState<number | null>(null);", "const [propertyToDelete, setPropertyToDelete] = useState<any>(null);")
    content = content.replace("const handleDeleteProperty = (id: number) => {", "const handleDeleteProperty = (id: any) => {")

    with open(path, "w") as f:
        f.write(content)

update_properties_page()
