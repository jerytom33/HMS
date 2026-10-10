'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Camera, ArrowLeft, User, Phone, MapPin, GraduationCap, HeartPulse, Save, Home } from 'lucide-react';
import { roomNumber, floorLabel, roomLabel, bedDisplayLabel, standaloneRoomNums, parseRoomString, bedTypeDisplay } from '@/lib/propertyTypes';
import { staffPhotoUrl, uploadPhoto } from '@/lib/photoClient';
import { adminCard } from '@/components/staff/adminStyles';

export default function AddStudentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const isEditing = !!editId;

  // Profile photo: chosen here, uploaded once the student is saved (and so has an id)
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [existingPhoto, setExistingPhoto] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    email: '',
    phone: '',
    address: '',
    course: '',
    yearOfStudy: '',
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelation: '',
  });

  const [properties, setProperties] = useState<any[]>([]);
  const [roomOverrides, setRoomOverrides] = useState<Record<string, any>>({});
  
  const [selectedPropId, setSelectedPropId] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [selectedBed, setSelectedBed] = useState('');

    useEffect(() => {
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
          setExistingPhoto(staffPhotoUrl(student) || '');
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
          });

          if (student.property && student.room && student.room !== 'Unassigned') {
            const prop = loadedProps.find(p => p.name === student.property);
            if (prop) {
                setSelectedPropId(prop.id);
                const parsed = parseRoomString(student.room);
                if (parsed) {
                    setSelectedFloor(parsed.floor);
                    setSelectedRoom(parsed.roomNum);
                    setSelectedBed(parsed.bed);
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
  }, [editId, isEditing, searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

    const handleSubmit = async (e: React.FormEvent) => {
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
        emergencyRelation: formData.emergencyRelation
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
        const parsed = parseRoomString(oldRoomInfo.room);
        if (parsed) {
          const oldPropId = p.id.toString();
          const oldRoomNum = parsed.roomNum;
          const oldBedStr = parsed.bed;
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

    if (photoFile && studentIdToSave) {
      const uploaded = await uploadPhoto(`/api/staff/students/${studentIdToSave}/photo`, photoFile);
      if (!uploaded.ok) alert(uploaded.message || "The student was saved, but the photo couldn't be uploaded.");
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
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 pb-8 sm:space-y-6 sm:pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={isEditing ? `/staff/students/${editId}` : "/staff/students"} className="p-2 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-800 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{isEditing ? "Edit Student Profile" : "Register New Student"}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{isEditing ? "Update student details and save changes." : "Enter complete student details to create a new profile."}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
          
          {/* Left Column: Photo & Quick Actions */}
          <div className="lg:col-span-1 space-y-6">
            <div className={adminCard}>
              <div className="p-6 flex flex-col items-center border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/50">
                <label className="relative group cursor-pointer mb-4 block">
                  <div className="w-32 h-32 rounded-full border-4 border-white shadow-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                    {photoPreview || existingPhoto
                      ? <img src={photoPreview || existingPhoto} alt="Student photo" className="w-full h-full object-cover" />
                      : <User className="w-12 h-12 text-gray-300" />}
                  </div>
                  <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                  <input type="file" accept="image/*" className="sr-only" aria-label="Student Photo"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setPhotoFile(file);
                      setPhotoPreview(URL.createObjectURL(file));
                    }} />
                </label>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Student Photo</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                  {photoFile ? 'The photo is saved with the student.' : 'Click the circle to choose a photo (JPG, PNG or WebP).'}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Detailed Forms */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Personal Details */}
            <div className={adminCard}>
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/50 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Personal Details</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-6">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">First Name <span className="text-red-500">*</span></label>
                  <input required name="firstName" value={formData.firstName} onChange={handleChange} type="text" placeholder="e.g. John" className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Last Name <span className="text-red-500">*</span></label>
                  <input required name="lastName" value={formData.lastName} onChange={handleChange} type="text" placeholder="e.g. Doe" className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date of Birth</label>
                  <input name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} type="date" className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Room Assignment */}
            <div className={adminCard}>
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/50 flex items-center gap-2">
                <Home className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Room Assignment</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-6">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Property</label>
                  <select 
                    value={selectedPropId} 
                    onChange={e => { setSelectedPropId(e.target.value); setSelectedFloor(''); setSelectedRoom(''); setSelectedBed(''); }} 
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Select Property</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Floor</label>
                  <select 
                    value={selectedFloor} 
                    onChange={e => { setSelectedFloor(e.target.value); setSelectedRoom(''); setSelectedBed(''); }} 
                    disabled={!selectedPropId}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 dark:bg-gray-800"
                  >
                    <option value="">Select Floor</option>
                    {selectedPropId && Array.from({ length: properties.find(p => String(p.id) === String(selectedPropId))?.floors || 0 }).map((_, i) => (
                      <option key={i+1} value={i+1}>{floorLabel(properties.find(p => String(p.id) === String(selectedPropId)), i+1)}</option>
                    ))}
{selectedPropId && standaloneRoomNums(roomOverrides, selectedPropId).length > 0 && <option value="S">Outside floors</option>}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Room</label>
                  <select 
                    value={selectedRoom} 
                    onChange={e => { setSelectedRoom(e.target.value); setSelectedBed(''); }}
                    disabled={!selectedFloor}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 dark:bg-gray-800"
                  >
                    <option value="">Select Room</option>
                    {selectedFloor && Array.from({ length: properties.find(p => String(p.id) === String(selectedPropId))?.roomsPerFloor?.[parseInt(selectedFloor) - 1] || 0 }).map((_, i) => {
                      const rNum = String(roomNumber(selectedFloor, i));
                      return <option key={rNum} value={rNum}>{roomLabel(properties.find(p => String(p.id) === String(selectedPropId)), rNum, roomOverrides[`${selectedPropId}-${rNum}`])}</option>
                    })}
{selectedFloor === 'S' && standaloneRoomNums(roomOverrides, selectedPropId).map(rNum => (
  <option key={rNum} value={rNum}>{roomLabel(properties.find(p => String(p.id) === String(selectedPropId)), rNum, roomOverrides[`${selectedPropId}-${rNum}`])}</option>
))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Bed</label>
                  <select 
                    value={selectedBed} 
                    onChange={e => setSelectedBed(e.target.value)}
                    disabled={!selectedRoom}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 dark:bg-gray-800"
                  >
                    <option value="">Select Bed</option>
                    {selectedRoom && (() => {
                      const prop = properties.find(p => String(p.id) === String(selectedPropId));
                      const override = roomOverrides[`${selectedPropId}-${selectedRoom}`];
                      const beds = override?.beds || (prop?.bedsPerFloor ? prop.bedsPerFloor[parseInt(selectedFloor) - 1] : prop?.bedsPerRoom) || 0;
                      return Array.from({ length: beds }).map((_, i) => (
                        <option key={i+1} value={String.fromCharCode(65 + i)}>{bedDisplayLabel(override, i)} ({bedTypeDisplay(override?.bedTypes, override?.bunkPositions, i).replace(' Bed', '')})</option>
                      ));
                    })()}
                  </select>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className={adminCard}>
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/50 flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Contact Information</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-6">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Address <span className="text-red-500">*</span></label>
                  <input required name="email" value={formData.email} onChange={handleChange} type="email" placeholder="john@example.com" className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number <span className="text-red-500">*</span></label>
                  <input required name="phone" value={formData.phone} onChange={handleChange} type="tel" placeholder="+1 234 567 8900" className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Home Address</label>
                  <textarea name="address" value={formData.address} onChange={handleChange} rows={3} placeholder="Full residential address..." className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"></textarea>
                </div>
              </div>
            </div>

            {/* Academic Information */}
            <div className={adminCard}>
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/50 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Academic Information</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-6">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Course / Major</label>
                  <input name="course" value={formData.course} onChange={handleChange} type="text" placeholder="e.g. Computer Science" className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Year of Study</label>
                  <select name="yearOfStudy" value={formData.yearOfStudy} onChange={handleChange} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">Select Year</option>
                    <option value="1">First Year</option>
                    <option value="2">Second Year</option>
                    <option value="3">Third Year</option>
                    <option value="4">Fourth Year</option>
                    <option value="5">Postgraduate</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className={adminCard}>
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/50 flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-red-500" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Emergency Contact</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-6">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Contact Name <span className="text-red-500">*</span></label>
                  <input required name="emergencyName" value={formData.emergencyName} onChange={handleChange} type="text" placeholder="Jane Doe" className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number <span className="text-red-500">*</span></label>
                  <input required name="emergencyPhone" value={formData.emergencyPhone} onChange={handleChange} type="tel" placeholder="+1 234 567 8900" className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Relationship</label>
                  <input name="emergencyRelation" value={formData.emergencyRelation} onChange={handleChange} type="text" placeholder="e.g. Mother, Father, Guardian" className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-800">
          <Link href={isEditing ? `/staff/students/${editId}` : "/staff/students"} className="px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-950 transition-colors shadow-sm">
            Cancel
          </Link>
          <button type="submit" className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2">
            <Save className="w-4 h-4" /> {isEditing ? "Update Student Record" : "Save Student Record"}
          </button>
        </div>
      </form>
    </div>
  );
}
