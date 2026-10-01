import os
import re

def update_students_page():
    path = "/home/midhun/works/hms/src/app/staff/students/page.tsx"
    with open(path, "r") as f:
        content = f.read()

    # 1. Replace initialization
    init_pattern = re.compile(r"useEffect\(\(\) => \{.*?const saved = localStorage\.getItem\('hms_students'\);.*?const savedProps = localStorage\.getItem\('hms_properties'\);.*?\}, \[\]\);", re.DOTALL)
    new_init = r"""  useEffect(() => {
    fetch('/api/v1-students?limit=1000').then(res => res.json()).then(data => {
      if (data && data.docs) setStudents(data.docs);
    }).catch(e => console.error(e));

    fetch('/api/v1-properties?limit=1000').then(res => res.json()).then(data => {
      if (data && data.docs) setProperties(data.docs);
    }).catch(e => console.error(e));
  }, []);"""
    content = init_pattern.sub(lambda m: new_init, content)

    # 2. Replace confirmDeleteStudent
    del_pattern = re.compile(r"const confirmDeleteStudent = \(\) => \{.*?setStudentToDelete\(null\);\n    \}\n  \};", re.DOTALL)
    new_del = r"""  const confirmDeleteStudent = async () => {
    if (studentToDelete !== null) {
      try {
        await fetch(`/api/v1-students/${studentToDelete}`, { method: 'DELETE' });
        const updatedStudents = students.filter(s => s.id !== studentToDelete);
        setStudents(updatedStudents);
        setStudentToDelete(null);
      } catch (e) { console.error(e); }
    }
  };"""
    content = del_pattern.sub(lambda m: new_del, content)
    
    content = content.replace("const [studentToDelete, setStudentToDelete] = useState<number | null>(null);", "const [studentToDelete, setStudentToDelete] = useState<any>(null);")
    content = content.replace("const handleDeleteStudent = (id: number) => {", "const handleDeleteStudent = (id: any) => {")

    with open(path, "w") as f:
        f.write(content)

def update_students_add_page():
    path = "/home/midhun/works/hms/src/app/staff/students/add/page.tsx"
    with open(path, "r") as f:
        content = f.read()

    # 1. Replace initialization
    init_pattern = re.compile(r"useEffect\(\(\) => \{.*?let loadedProps: any\[\] = \[\];.*?const savedProps = localStorage\.getItem\('hms_properties'\);.*?const savedOverrides = localStorage\.getItem\('hms_room_overrides'\);.*?if \(isEditing\) \{.*?const saved = localStorage\.getItem\('hms_students'\);.*?\} else \{.*?\}\n  \}, \[editId, isEditing, searchParams\]\);", re.DOTALL)
    new_init = r"""  useEffect(() => {
    let loadedProps: any[] = [];
    fetch('/api/v1-properties?limit=1000').then(res => res.json()).then(data => {
      if (data && data.docs) {
        loadedProps = data.docs;
        setProperties(data.docs);
      }
    });
    
    fetch('/api/v1-room-overrides?limit=1000').then(res => res.json()).then(data => {
      if (data && data.docs) {
        const overrides: any = {};
        data.docs.forEach((doc: any) => { overrides[doc.overrideKey] = doc; });
        setRoomOverrides(overrides);
      }
    });

    if (isEditing) {
      fetch(`/api/v1-students/${editId}`).then(res => res.json()).then(student => {
        if (student) {
          const [firstName, ...lastNameParts] = (student.name || '').split(' ');
          setFormData({
            firstName: firstName || '',
            lastName: lastNameParts.join(' ') || '',
            dateOfBirth: student.dateOfBirth || '',
            gender: student.gender || '',
            email: student.email || '',
            phone: student.phone || '',
            address: student.address || '',
            course: student.course || '',
            yearOfStudy: student.yearOfStudy || '',
            emergencyName: student.emergencyName || '',
            emergencyPhone: student.emergencyPhone || '',
            emergencyRelation: student.emergencyRelation || '',
            password: student.password || ''
          });

          if (student.property && student.room && student.room !== 'Unassigned') {
            const prop = loadedProps.find(p => p.name === student.property);
            if (prop) {
                setSelectedPropId(prop.id);
                const match = student.room.match(/Room (\d)(\d+) - Bed ([A-Z0-9]+)/i);
                if (match) {
                    setSelectedFloor(match[1]);
                    setSelectedRoom(match[1] + match[2]);
                    setSelectedBed(match[3]);
                }
            }
          }
        }
      });
    } else {
      const fromRoom = searchParams.get('from_room');
      if (fromRoom) {
        const pId = searchParams.get('property_id');
        const floor = searchParams.get('floor');
        const bed = searchParams.get('bed');
        
        if (pId) setSelectedPropId(pId);
        if (floor) setSelectedFloor(floor);
        if (fromRoom) setSelectedRoom(fromRoom);
        if (bed !== null) {
            setSelectedBed(String.fromCharCode(65 + parseInt(bed)));
        }
      }
    }
  }, [editId, isEditing, searchParams]);"""
    content = init_pattern.sub(lambda m: new_init, content)

    # 2. Replace handleSubmit
    submit_pattern = re.compile(r"const handleSubmit = \(e: React.FormEvent\) => \{.*?if \(overridesChanged\) \{.*?localStorage\.setItem\('hms_room_overrides', JSON\.stringify\(currentOverrides\)\);\n    \}(.*?)\n  \};", re.DOTALL)
    new_submit = r"""  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let currentStudents: any[] = [];
    try {
        const res = await fetch('/api/v1-students?limit=1000');
        const data = await res.json();
        if (data && data.docs) currentStudents = data.docs;
    } catch(err) {}
    
    const prop = properties.find(p => String(p.id) === String(selectedPropId));
    const propName = prop ? prop.name : undefined;
    const roomStr = (selectedPropId && selectedFloor && selectedRoom && selectedBed) 
        ? `Room ${selectedRoom} - Bed ${selectedBed}` : undefined;

    let oldRoomInfo = null;
    if (isEditing) {
      const oldStudent = currentStudents.find((s: any) => String(s.id) === String(editId));
      if (oldStudent && oldStudent.room && oldStudent.room !== 'Unassigned') {
        oldRoomInfo = { room: oldStudent.room, property: oldStudent.property };
      }
    }
    
    let studentIdToSave = editId;

    if (isEditing) {
      const updated = {
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        address: formData.address,
        course: formData.course,
        yearOfStudy: formData.yearOfStudy,
        emergencyName: formData.emergencyName,
        emergencyPhone: formData.emergencyPhone,
        emergencyRelation: formData.emergencyRelation,
        password: formData.password,
        room: roomStr || 'Unassigned',
        property: propName || '',
        status: roomStr ? 'Active' : 'Active'
      };
      await fetch(`/api/v1-students/${editId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json'}, body: JSON.stringify(updated) });
    } else {
      const newStudent = {
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        phone: formData.phone,
        room: roomStr || 'Unassigned',
        property: propName || '',
        status: roomStr ? 'Active' : 'Active',
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        address: formData.address,
        course: formData.course,
        yearOfStudy: formData.yearOfStudy,
        emergencyName: formData.emergencyName,
        emergencyPhone: formData.emergencyPhone,
        emergencyRelation: formData.emergencyRelation,
        password: formData.password
      };
      
      const res = await fetch('/api/v1-students', { method: 'POST', headers: { 'Content-Type': 'application/json'}, body: JSON.stringify(newStudent) });
      const data = await res.json();
      if (data.doc) studentIdToSave = data.doc.id;
    }

    const currentOverrides = { ...roomOverrides };
    let overridesChanged = false;

    if (oldRoomInfo && oldRoomInfo.room !== roomStr) {
      const p = properties.find(pr => pr.name === oldRoomInfo.property);
      if (p) {
        const match = oldRoomInfo.room.match(/Room (\d)(\d+) - Bed ([A-Z0-9]+)/i);
        if (match) {
          const oldPropId = p.id.toString();
          const oldRoomNum = match[1] + match[2];
          const oldBedStr = match[3];
          const overrideKey = `${oldPropId}-${oldRoomNum}`;
          
          if (currentOverrides[overrideKey]) {
            const rOverride = currentOverrides[overrideKey];
            const bIndex = typeof oldBedStr === 'string' && oldBedStr.match(/[A-Z]/i) 
                ? oldBedStr.toUpperCase().charCodeAt(0) - 65 
                : parseInt(oldBedStr) - 1;
                
            if (rOverride.bedStatuses && rOverride.bedStatuses[bIndex] !== undefined) {
              const newStatuses = [...rOverride.bedStatuses];
              const newOccupants = [...(rOverride.bedOccupants || [])];
              newStatuses[bIndex] = false;
              newOccupants[bIndex] = null;
              
              const newFilled = newStatuses.filter(v => v).length;
              const newFree = rOverride.beds - newFilled;
              let newStatus = rOverride.status || 'available';
              if (newFilled === rOverride.beds && rOverride.beds > 0) {
                newStatus = 'occupied';
              } else if (newFree > 0 && newStatus !== 'maintenance') {
                newStatus = 'available';
              }
              
              currentOverrides[overrideKey] = {
                ...rOverride,
                bedStatuses: newStatuses,
                bedOccupants: newOccupants,
                filledBeds: newFilled,
                freeBeds: newFree,
                status: newStatus
              };
              overridesChanged = true;
            }
          }
        }
      }
    }

    if (selectedPropId && selectedFloor && selectedRoom && selectedBed) {
      const overrideKey = `${selectedPropId}-${selectedRoom}`;
      const roomOverride = currentOverrides[overrideKey] || { overrideKey };
      const bedsCount = roomOverride.beds || (prop?.bedsPerFloor ? prop.bedsPerFloor[parseInt(selectedFloor) - 1] : prop?.bedsPerRoom) || 0;
      
      let bedStatuses = roomOverride.bedStatuses ? [...roomOverride.bedStatuses] : Array(bedsCount).fill(false);
      let bedOccupants = roomOverride.bedOccupants ? [...roomOverride.bedOccupants] : Array(bedsCount).fill(null);
      
      const bedIndex = typeof selectedBed === 'string' && selectedBed.match(/[A-Z]/i) 
          ? selectedBed.toUpperCase().charCodeAt(0) - 65 
          : parseInt(selectedBed) - 1;
      
      if (bedIndex >= 0 && bedIndex < bedsCount) {
         bedStatuses[bedIndex] = true;
         bedOccupants[bedIndex] = studentIdToSave;
         
         const newFilled = bedStatuses.filter(v => v).length;
         const newFree = bedsCount - newFilled;
         let newStatus = roomOverride.status || 'available';
         if (newFilled === bedsCount && bedsCount > 0) {
           newStatus = 'occupied';
         } else if (newFree > 0 && newStatus !== 'maintenance') {
           newStatus = 'available';
         }
         
         currentOverrides[overrideKey] = {
             ...roomOverride,
             beds: bedsCount,
             bedStatuses,
             bedOccupants,
             filledBeds: newFilled,
             freeBeds: newFree,
             status: newStatus
         };
         overridesChanged = true;
      }
    }

    if (overridesChanged) {
        for (const [key, val] of Object.entries(currentOverrides)) {
            const data: any = val;
            if (data.id) {
                await fetch(`/api/v1-room-overrides/${data.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json'}, body: JSON.stringify(data) });
            } else {
                await fetch(`/api/v1-room-overrides`, { method: 'POST', headers: { 'Content-Type': 'application/json'}, body: JSON.stringify(data) });
            }
        }
    }

    if (isEditing) {
        router.push(`/staff/students/${editId}`);
    } else {
        const returnRoomEdit = sessionStorage.getItem('hms_return_room_edit');
        if (returnRoomEdit) {
            sessionStorage.setItem('hms_new_assigned_student_id', String(studentIdToSave));
            router.push('/staff/properties');
        } else {
            router.push('/staff/students');
        }
    }
  };"""
    content = submit_pattern.sub(lambda m: new_submit, content)

    # Some replacements for id mismatch
    content = content.replace("properties.find(p => p.id.toString() === selectedPropId)", "properties.find(p => String(p.id) === String(selectedPropId))")

    with open(path, "w") as f:
        f.write(content)


update_students_page()
update_students_add_page()
