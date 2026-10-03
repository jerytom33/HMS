'use client';
import { Search, MapPin, AlertTriangle, Building2, LayoutGrid, CheckCircle2, AlertCircle, X, Plus, Edit, Trash2, Upload, Share2, ArrowLeft } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';

const INITIAL_PROPERTIES: any[] = [];

const MOCK_STUDENTS: any[] = [];

const AutoCarousel = ({ images, name }: { images: string[], name: string }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!images || images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [images]);

  if (!images || images.length === 0) {
    return <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-700"></div>;
  }

  return (
    <>
      <img key={currentIndex} src={images[currentIndex]} alt={name} className="w-full h-full object-cover animate-in fade-in zoom-in-95 duration-1000" />
      {images.length > 1 && (
        <div className="absolute top-4 left-4 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded-md backdrop-blur-sm z-20 shadow-sm border border-white/10">
          {currentIndex + 1} / {images.length}
        </div>
      )}
      {images.length > 1 && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-1.5 z-20 bg-black/40 px-2 py-1.5 rounded-full backdrop-blur-md">
          {images.map((_, idx) => (
            <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-4 bg-white dark:bg-gray-900 dark:bg-gray-900' : 'w-1.5 bg-white dark:bg-gray-900 dark:bg-gray-900/50'}`}></div>
          ))}
        </div>
      )}
    </>
  );
};

export default function AdminProperties() {
  const [properties, setProperties] = useState<any[]>(INITIAL_PROPERTIES);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableStudents, setAvailableStudents] = useState<any[]>(MOCK_STUDENTS);

    // Load real students from API
  useEffect(() => {
    fetch('/api/v1-students?limit=1000').then(res => res.json()).then(data => {
      if (data && data.docs) {
        setAvailableStudents(data.docs);
      }
    }).catch(e => console.error(e));
  }, []);

  // Restore room modal if returning from student details
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const returnRoom = sessionStorage.getItem('hms_return_room');
      if (returnRoom) {
        try {
          const parsed = JSON.parse(returnRoom);
          setSelectedRoom(parsed);
          sessionStorage.removeItem('hms_return_room');
        } catch (e) {}
      }
    }
  }, []);

  // Restore room edit state if returning from adding a student
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const returnRoomEdit = sessionStorage.getItem('hms_return_room_edit');
      const newlyCreatedStudentId = sessionStorage.getItem('hms_new_assigned_student_id');
      if (returnRoomEdit) {
        try {
          const parsed = JSON.parse(returnRoomEdit);
          setSelectedPropertyId(parsed.propertyId);
          setSelectedFloor(parsed.floor);
          setSelectedRoom(parsed.room);
          
          if (newlyCreatedStudentId) {
             const bedIdx = parsed.activeSearchBed;
             const newStatuses = [...parsed.editData.bedStatuses];
             const newOccupants = [...parsed.editData.bedOccupants];
             newStatuses[bedIdx] = true;
             newOccupants[bedIdx] = newlyCreatedStudentId;

             const newFilled = newStatuses.filter(v => v).length;
             const newFree = parsed.room.beds - newFilled;
             let newStatus = parsed.room.status;
             if (newFilled === parsed.room.beds && parsed.room.beds > 0) {
               newStatus = 'occupied';
             } else if (newFree > 0 && newStatus !== 'maintenance') {
               newStatus = 'available';
             }
             
             setEditRoomData({ ...parsed.editData, bedStatuses: newStatuses, bedOccupants: newOccupants, filledBeds: newFilled, freeBeds: newFree, status: newStatus });
             sessionStorage.removeItem('hms_new_assigned_student_id');
          } else {
             setEditRoomData(parsed.editData);
          }
          
          setIsEditingRoom(true);
          sessionStorage.removeItem('hms_return_room_edit');
        } catch (e) {}
      }
    }
  }, []);
  const [selectedPropertyId, setSelectedPropertyId] = useState<any>(1);
  const [selectedFloor, setSelectedFloor] = useState(1);
  const [isAddPropertyModalOpen, setIsAddPropertyModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<{ roomNum: number, status: string, beds: number, freeBeds?: number, filledBeds?: number, bedStatuses?: boolean[], bedOccupants?: (string | null)[], bedImages?: string[][], bedDescriptions?: string[], roomPrice?: string, roomFacilitiesList?: { images: string[], description: string }[], roomFacilitiesImages?: string[], roomFacilitiesDescription?: string, roomFacilitiesDescriptions?: string[] } | null>(null);  

  const [editingPropertyId, setEditingPropertyId] = useState<any>(null);

  const [propertyToDelete, setPropertyToDelete] = useState<any>(null);
  const [roomFilters, setRoomFilters] = useState({ occupied: false, available: false, maintenance: false });
  const [editPropertyForm, setEditPropertyForm] = useState({ name: '', location: '', rooms: '', floors: '1', beds: '2', roomsPerFloor: ['0'], isCustomBedsPerFloor: false, bedsPerFloor: ['2'], images: [] as string[] });
  
  // Track specific room edits (status and bed counts)
  const [roomOverrides, setRoomOverrides] = useState<Record<string, { id?: any, status?: string, beds?: number, freeBeds?: number, filledBeds?: number, bedStatuses?: boolean[], bedOccupants?: (string | null)[], bedImages?: string[][], bedDescriptions?: string[], roomPrice?: string, roomFacilitiesList?: { images: string[], description: string }[], roomFacilitiesImages?: string[], roomFacilitiesDescription?: string, roomFacilitiesDescriptions?: string[] }>>({});
  const [isEditFloorModalOpen, setIsEditFloorModalOpen] = useState(false);
  const [editFloorData, setEditFloorData] = useState({ floor: 1, name: '', rooms: 0, beds: 0, image: '', floorFacilitiesList: [] as { description: string, images: string[] }[] });
  const [isEditingRoom, setIsEditingRoom] = useState(false);
  const [editRoomData, setEditRoomData] = useState({ status: '', beds: 0, freeBeds: 0, filledBeds: 0, bedStatuses: [] as boolean[], bedOccupants: [] as (string | null)[], bedImages: [] as string[][], bedDescriptions: [] as string[], roomPrice: '', roomFacilitiesList: [] as { images: string[], description: string }[], roomFacilitiesImages: [] as string[], roomFacilitiesDescription: '', roomFacilitiesDescriptions: [] as string[] });
  const [activeSearchBed, setActiveSearchBed] = useState<number | null>(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<{name: string, room: number, bed: string, phone: string, course: string} | null>(null);

  const [newProperty, setNewProperty] = useState({ name: '', location: '', rooms: '', floors: '1', beds: '2', roomsPerFloor: ['0'], isCustomBedsPerFloor: false, bedsPerFloor: ['2'], images: [] as string[] });
  const [successMessage, setSuccessMessage] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isFullScreenMap, setIsFullScreenMap] = useState(false);

    // Load from API on mount
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
  }, []);

  const filteredProperties = useMemo(() => {
    return properties.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.location.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery, properties]);

  const selectedProperty = properties.find(p => p.id === selectedPropertyId) || properties[0];

  // Generate deterministic rooms based on property and floor, merged with any manual overrides
  const rooms = useMemo(() => {
    if (!selectedProperty) return [];
    
    let roomsOnThisFloor = 0;
    if (selectedProperty.roomsPerFloor && selectedProperty.roomsPerFloor.length >= selectedFloor) {
      roomsOnThisFloor = selectedProperty.roomsPerFloor[selectedFloor - 1];
    } else {
      const totalRooms = selectedProperty.rooms || 0;
      const totalFloors = selectedProperty.floors || 1;
      const baseRoomsPerFloor = Math.floor(totalRooms / totalFloors);
      const extraRooms = totalRooms % totalFloors;
      roomsOnThisFloor = selectedFloor <= extraRooms ? baseRoomsPerFloor + 1 : baseRoomsPerFloor;
    }
    
    if (roomsOnThisFloor <= 0) return [];

    return Array.from({ length: roomsOnThisFloor }).map((_, i) => {
      const roomNum = (selectedFloor * 100) + i + 1;
      const hash = roomNum * selectedPropertyId;
      // No dummy data - default to available
      const defaultStatus: string = 'available';
      const defaultBeds = (selectedProperty?.isCustomBedsPerFloor && selectedProperty?.bedsPerFloor?.length >= selectedFloor) ? (selectedProperty.bedsPerFloor[selectedFloor - 1] || 2) : (selectedProperty?.beds || 2);
      
      const overrideKey = `${selectedPropertyId}-${roomNum}`;
      const override = roomOverrides[overrideKey];
      
      return { 
        roomNum, 
        status: override?.status || defaultStatus,
        beds: override?.beds || defaultBeds,
        freeBeds: override?.freeBeds !== undefined ? override.freeBeds : (defaultStatus === 'occupied' ? 0 : defaultBeds),
        filledBeds: override?.filledBeds !== undefined ? override.filledBeds : (defaultStatus === 'occupied' ? defaultBeds : 0),
        bedStatuses: override?.bedStatuses,
        bedOccupants: override?.bedOccupants,
        bedImages: override?.bedImages,
        bedDescriptions: override?.bedDescriptions,
        roomPrice: override?.roomPrice,
        roomFacilitiesList: override?.roomFacilitiesList,
        roomFacilitiesImages: override?.roomFacilitiesImages,
        roomFacilitiesDescription: override?.roomFacilitiesDescription,
        roomFacilitiesDescriptions: override?.roomFacilitiesDescriptions
      };
    });
  }, [selectedPropertyId, selectedFloor, selectedProperty, roomOverrides]);

    const handleAddProperty = async () => {
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
  };

  const handleEditPropertyStart = (prop: any) => {
    const floorsCount = prop.floors || 1;
    let fallbackRoomsPerFloor = [];
    if (prop.roomsPerFloor) {
      fallbackRoomsPerFloor = prop.roomsPerFloor.map(String);
    } else {
      const base = Math.floor((prop.rooms || 0) / floorsCount);
      const extra = (prop.rooms || 0) % floorsCount;
      for (let i = 0; i < floorsCount; i++) {
        fallbackRoomsPerFloor.push(String(i < extra ? base + 1 : base));
      }
    }
    
    let fallbackBedsPerFloor = [];
    if (prop.bedsPerFloor) {
      fallbackBedsPerFloor = prop.bedsPerFloor.map(String);
    } else {
      for (let i = 0; i < floorsCount; i++) {
        fallbackBedsPerFloor.push((prop.beds || 2).toString());
      }
    }
    
    setEditPropertyForm({
      name: prop.name,
      location: prop.location,
      rooms: prop.rooms?.toString() || '0',
      floors: floorsCount.toString(),
      beds: (prop.beds || 2).toString(),
      roomsPerFloor: fallbackRoomsPerFloor,
      isCustomBedsPerFloor: prop.isCustomBedsPerFloor || false,
      bedsPerFloor: fallbackBedsPerFloor,
      images: prop.images || []
    });
    setEditingPropertyId(prop.id);
  };




  const filteredRooms = useMemo(() => {
    const isFilterActive = roomFilters.occupied || roomFilters.available || roomFilters.maintenance;
    if (!isFilterActive) return rooms;
    
    return rooms.filter(room => {
      if (room.status === 'occupied' && roomFilters.occupied) return true;
      if (room.status === 'available' && roomFilters.available) return true;
      if (room.status === 'maintenance' && roomFilters.maintenance) return true;
      return false;
    });
  }, [rooms, roomFilters]);

  const handleDeleteProperty = (id: any) => {
    setPropertyToDelete(id);
  };

    const confirmDeleteProperty = async () => {
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
  };

    const handleUpdateProperty = async () => {
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
  };

  const handleEditRoomStart = () => {
    if (!selectedRoom) return;
    const filledCount = selectedRoom.filledBeds !== undefined ? selectedRoom.filledBeds : (selectedRoom.status === 'occupied' ? selectedRoom.beds : 0);
    const initialBedStatuses = selectedRoom.bedStatuses || Array.from({ length: selectedRoom.beds }, (_, i) => i < filledCount);
    const initialBedOccupants = selectedRoom.bedOccupants || Array.from({ length: selectedRoom.beds }, () => null);
    const initialBedImages = selectedRoom.bedImages || Array.from({ length: selectedRoom.beds }, () => []);
    const initialBedDescriptions = selectedRoom.bedDescriptions || Array.from({ length: selectedRoom.beds }, () => '');
    
    setEditRoomData({ 
      status: selectedRoom.status, 
      beds: selectedRoom.beds,
      freeBeds: selectedRoom.freeBeds !== undefined ? selectedRoom.freeBeds : selectedRoom.beds,
      filledBeds: filledCount,
      bedStatuses: initialBedStatuses,
      bedOccupants: initialBedOccupants,
      bedImages: initialBedImages,
      bedDescriptions: initialBedDescriptions,
      roomPrice: selectedRoom.roomPrice || '',
      roomFacilitiesList: selectedRoom.roomFacilitiesList || 
        (selectedRoom.roomFacilitiesImages?.length ? selectedRoom.roomFacilitiesImages.map((img, i) => ({
          images: [img],
          description: selectedRoom.roomFacilitiesDescriptions?.[i] || selectedRoom.roomFacilitiesDescription || ''
        })) : []),
      roomFacilitiesImages: selectedRoom.roomFacilitiesImages || [],
      roomFacilitiesDescription: selectedRoom.roomFacilitiesDescription || '',
      roomFacilitiesDescriptions: selectedRoom.roomFacilitiesDescriptions || [],
    });
    setActiveSearchBed(null);
    setStudentSearchQuery('');
    setIsEditingRoom(true);
  };

    const handleSaveRoomEdit = async () => {
    if (!selectedRoom) return;
    if (editRoomData.freeBeds < 0 || editRoomData.filledBeds < 0 || editRoomData.freeBeds > editRoomData.beds || editRoomData.filledBeds > editRoomData.beds) {
      return;
    }
    
    const overrideKey = `${selectedPropertyId}-${selectedRoom.roomNum}`;
    
    const overrideData: any = {
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

    const promises: any[] = [];
    
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
  };

  const handleShareBed = async (bedIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedRoom || !selectedProperty) return;
    
    const bedLabel = String.fromCharCode(65 + bedIndex);
    const isFilled = selectedRoom.bedStatuses ? selectedRoom.bedStatuses[bedIndex] : bedIndex < (selectedRoom.filledBeds || 0);
    const bedDescription = selectedRoom.bedDescriptions?.[bedIndex];
    const bedImages = selectedRoom.bedImages?.[bedIndex]?.filter(Boolean) || [];
    
    const propertyImages = selectedProperty.images || [];
    
    const floorFacilities = selectedProperty.floorFacilitiesLists?.[selectedFloor - 1] || [];
    let floorFacilitiesText = '';
    if (floorFacilities.length > 0) {
      floorFacilitiesText = `\n\n🏢 *Floor ${selectedFloor} Facilities*\n` + floorFacilities.map((f: any) => 
        `- ${f.description || 'Facility'}${f.images?.length > 0 ? `\n  Images:\n  ${f.images.join('\n  ')}` : ''}`
      ).join('\n');
    }

    const roomFacilities = selectedRoom.roomFacilitiesList || [];
    let roomFacilitiesText = '';
    if (roomFacilities.length > 0) {
      roomFacilitiesText = `\n\n🛋️ *Room Facilities*\n` + roomFacilities.map((f: any) =>
        `- ${f.description || 'Facility'}${f.images?.length > 0 ? `\n  Images:\n  ${f.images.join('\n  ')}` : ''}`
      ).join('\n');
    }
    
    const shareText = `🏨 *Property Details*
Name: ${selectedProperty.name}
Location: ${selectedProperty.location}
${propertyImages.length > 0 ? `Images:\n${propertyImages.join('\n')}` : ''}${floorFacilitiesText}

🚪 *Room ${selectedRoom.roomNum} Details*
Floor: ${selectedFloor}
Price: ${selectedRoom.roomPrice ? `₹${selectedRoom.roomPrice}` : 'Not set'}
Total Beds: ${selectedRoom.beds} (${selectedRoom.freeBeds} Free)${roomFacilitiesText}

🛏️ *Bed ${bedLabel} Details*
Status: ${isFilled ? 'Occupied' : 'Free'}
${bedDescription ? `Description: ${bedDescription}\n` : ''}${bedImages.length > 0 ? `Images:\n${bedImages.join('\n')}\n` : ''}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Bed ${bedLabel} at ${selectedProperty.name}`,
          text: shareText
        });
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  return (
    <div className="space-y-6">
      <style>{`
        .property-glass-card {
          position: relative;
          border-radius: 1rem;
          background: transparent;
          overflow: hidden;
        }

        .property-glass-card::before {
          content: "";
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: conic-gradient(
            from 0deg,
            transparent 0deg,
            transparent 280deg,
            red 330deg,
            #ff4444 360deg
          );
          animation: rotateBorder 5s linear infinite;
          z-index: 0;
          filter: blur(8px);
          opacity: 0.8;
          transition: all 0.3s ease;
        }

        .property-glass-card:hover::before {
          filter: blur(12px);
          opacity: 1;
          animation-duration: 2.5s;
        }

        .property-glass-card::after {
          content: "";
          position: absolute;
          inset: 2px;
          background: #ffffff;
          border-radius: inherit;
          z-index: 1;
        }

        @keyframes rotateBorder {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .card-content-layer {
          position: relative;
          z-index: 2;
          height: 100%;
          display: flex;
          flex-direction: column;
          border-radius: inherit;
          overflow: hidden;
        }
        
        .glass-pill-badge {
          background: rgba(34, 197, 94, 0.15);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(34, 197, 94, 0.3);
          box-shadow: 0 0 10px rgba(34, 197, 94, 0.2);
          padding: 4px 10px;
          border-radius: 9999px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        
        .pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #22c55e;
          box-shadow: 0 0 8px #22c55e;
          animation: pulse-glow 2s infinite;
        }
        
        @keyframes pulse-glow {
          0% { opacity: 0.6; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.1); box-shadow: 0 0 12px #22c55e; }
          100% { opacity: 0.6; transform: scale(0.9); }
        }
      `}</style>
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100 tracking-tight">Property Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">Manage buildings and view interactive room layouts.</p>
        </div>
        <button 
          onClick={() => setIsAddPropertyModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 shadow-sm flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Add Property
        </button>
      </div>

      <div className="flex flex-col gap-6">
        {/* Properties List */}
        {!isFullScreenMap && (
        <div className="bg-white dark:bg-gray-900 dark:bg-gray-900 shadow-sm rounded-lg border border-gray-200 dark:border-gray-800 dark:border-gray-800 flex flex-col h-[calc(100vh-150px)] min-h-[600px]">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between bg-gray-50 dark:bg-gray-950 dark:bg-gray-950 gap-3">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 dark:text-gray-100">Your Properties</h3>
            <div className="relative w-full sm:w-auto">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-48 pl-9 pr-4 py-1.5 border border-gray-300 dark:border-gray-700 dark:border-gray-700 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 outline-none" 
              />
            </div>
          </div>
          <div className="p-6 flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 dark:bg-gray-950/50">
            {filteredProperties.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredProperties.map((prop) => (
                  <div 
                    key={prop.id} 
                    onClick={() => { setSelectedPropertyId(prop.id); setSelectedFloor(1); setIsEditingRoom(false); setSelectedRoom(null); setIsFullScreenMap(true); }}
                    className="property-glass-card group cursor-pointer transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl hover:shadow-red-500/20"
                  >
                    <div className="card-content-layer">
                      <div className="h-80 sm:h-[350px] relative bg-white dark:bg-gray-900 dark:bg-gray-900/20 flex items-center justify-center overflow-hidden">
                        <AutoCarousel images={prop.images} name={prop.name} />
                        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleEditPropertyStart(prop); }}
                            className="bg-white dark:bg-gray-900 dark:bg-gray-900/20 hover:bg-white dark:bg-gray-900 dark:bg-gray-900 text-white hover:text-blue-600 p-2 rounded-lg backdrop-blur-sm transition-all shadow-sm border border-white/20"
                            title="Edit Property"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteProperty(prop.id); }}
                            className="bg-white dark:bg-gray-900 dark:bg-gray-900/20 hover:bg-red-500 text-white p-2 rounded-lg backdrop-blur-sm transition-all shadow-sm border border-white/20"
                            title="Delete Property"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="pt-10 pb-6 px-6 flex-1 flex flex-col relative z-10">
                        <h4 className="font-bold text-xl text-gray-900 dark:text-gray-100 dark:text-gray-100 mb-1 group-hover:text-red-600 transition-colors">{prop.name}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 flex items-center gap-1.5 mb-6">
                          <MapPin className="h-4 w-4 text-gray-400" /> {prop.location}
                        </p>
                        
                        <div className="grid grid-cols-2 gap-4 mt-auto border-t border-gray-200 dark:border-gray-800 dark:border-gray-800/50 pt-5">
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 font-medium mb-1 uppercase tracking-wider flex items-center gap-1"><LayoutGrid className="h-3 w-3" /> Rooms</span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100 dark:text-gray-100 text-lg">{prop.rooms}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 font-medium mb-1 uppercase tracking-wider">Floors</span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100 dark:text-gray-100 text-lg">{prop.floors || 1}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 font-medium mb-1 uppercase tracking-wider">Occupied</span>
                            <span className="font-semibold text-blue-600 text-lg">{prop.occupancy}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 font-medium mb-1 uppercase tracking-wider">Status</span>
                            <div className="glass-pill-badge mt-1">
                              <span className="pulse-dot"></span>
                              <span className="font-semibold text-green-700 text-xs tracking-wide">{prop.status || 'Active'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 dark:text-gray-400 text-sm">
                No properties found matching "{searchQuery}"
              </div>
            )}
          </div>
        </div>
        )}

        {/* Interactive Room Map */}
        {isFullScreenMap && (
        <div className="bg-white dark:bg-gray-900 dark:bg-gray-900 shadow-sm rounded-lg border border-gray-200 dark:border-gray-800 dark:border-gray-800 flex flex-col h-[calc(100vh-150px)] min-h-[600px] overflow-hidden relative">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-950 dark:bg-gray-950">
            <div className="flex items-center gap-3">
              {isFullScreenMap && (
                <button 
                  onClick={() => setIsFullScreenMap(false)}
                  className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 dark:text-gray-400 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 dark:text-gray-100">Room Map: {selectedProperty?.name}</h3>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setEditFloorData({
                    floor: selectedFloor,
                    name: selectedProperty?.floorNames?.[selectedFloor - 1] || '',
                    image: selectedProperty?.floorImages?.[selectedFloor - 1] || '',
                    rooms: selectedProperty?.roomsPerFloor?.[selectedFloor - 1] || 0,
                    beds: selectedProperty?.bedsPerFloor?.[selectedFloor - 1] || (selectedProperty?.beds || 2),
                    floorFacilitiesList: selectedProperty?.floorFacilitiesLists?.[selectedFloor - 1] 
                      ? JSON.parse(JSON.stringify(selectedProperty.floorFacilitiesLists[selectedFloor - 1])) 
                      : []
                  });
                  setIsEditFloorModalOpen(true);
                }}
                className="text-sm bg-white dark:bg-gray-900 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 dark:border-gray-700 text-gray-700 dark:text-gray-300 dark:text-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-950 dark:hover:bg-gray-800 dark:bg-gray-950 flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Edit className="w-4 h-4" /> Edit Floor
              </button>
              <select 
                value={selectedFloor}
                onChange={(e) => setSelectedFloor(Number(e.target.value))}
                className="text-sm border-gray-300 dark:border-gray-700 dark:border-gray-700 rounded-md py-1.5 pl-3 pr-8 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 dark:bg-gray-900 shadow-sm"
              >
                {Array.from({ length: selectedProperty?.floors || 1 }, (_, i) => i + 1).map(floor => (
                  <option key={floor} value={floor}>{selectedProperty?.floorNames?.[floor - 1] ? `${selectedProperty.floorNames[floor - 1]} (Floor ${floor})` : `Floor ${floor}`}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-950 dark:bg-gray-950 flex-1 overflow-auto pb-24">
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 min-w-full">
              {filteredRooms.map(({ roomNum, status, beds, freeBeds, filledBeds, bedStatuses, bedOccupants, bedImages, bedDescriptions, roomPrice, roomFacilitiesList, roomFacilitiesImages, roomFacilitiesDescription, roomFacilitiesDescriptions }) => (
                <div 
                  key={roomNum} 
                  onClick={() => {
                    setSelectedRoom({ roomNum, status, beds, freeBeds, filledBeds, bedStatuses, bedOccupants, bedImages, bedDescriptions, roomPrice, roomFacilitiesList, roomFacilitiesImages, roomFacilitiesDescription, roomFacilitiesDescriptions });
                    setIsEditingRoom(false);
                  }}
                  className="property-glass-card group cursor-pointer transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl hover:shadow-red-500/20 flex flex-col h-full"
                >
                  <div className={`card-content-layer border relative flex flex-col overflow-hidden h-full ${
                    status === 'occupied' ? 'bg-white dark:bg-gray-900 dark:bg-gray-900 border-gray-200 dark:border-gray-800 dark:border-gray-800' :
                    status === 'available' ? 'bg-green-50 border-green-200' :
                    'bg-red-50 border-red-200'
                  }`}>
                    {bedImages && bedImages.flat().filter(Boolean).length > 0 && (
                      <div className="h-80 sm:h-[350px] relative bg-black/5 flex items-center justify-center overflow-hidden shrink-0 border-b border-gray-200 dark:border-gray-800 dark:border-gray-800/50">
                        <AutoCarousel images={bedImages.flat().filter(Boolean) as string[]} name={`Room ${roomNum}`} />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent pointer-events-none z-10"></div>
                      </div>
                    )}
                    <div className="p-3 flex flex-col flex-1">
                      <div className="flex justify-between items-start">
                        <div className="font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100 group-hover:text-red-600 transition-colors">{roomNum}</div>
                        {status === 'occupied' ? <CheckCircle2 className="h-4 w-4 text-gray-400" /> :
                         status === 'maintenance' ? <AlertCircle className="h-4 w-4 text-red-500" /> :
                         <span className="text-green-600 font-semibold text-xs">Free</span>}
                      </div>
                      <div className="mt-auto pt-3 flex flex-col gap-1.5">
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 dark:border-gray-800 pb-1">
                          {beds} Total Bed{beds !== 1 ? 's' : ''}
                        </div>
                        <div className="flex justify-between text-xs mt-0.5">
                          <span className="text-green-600 font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                            {freeBeds !== undefined ? freeBeds : '-'} Free
                          </span>
                          <span className="text-red-500 font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                            {filledBeds !== undefined ? filledBeds : '-'} Filled
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Legend / Filters */}
            <div className="mt-6 mb-2 flex flex-wrap gap-4 text-xs font-medium bg-white dark:bg-gray-900 dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-800 dark:border-gray-800 shadow-sm w-fit">
              <label className="flex items-center gap-2 cursor-pointer select-none hover:opacity-80 transition-opacity">
                <input 
                  type="checkbox" 
                  checked={roomFilters.occupied}
                  onChange={(e) => setRoomFilters({...roomFilters, occupied: e.target.checked})}
                  className="rounded border-gray-300 dark:border-gray-700 dark:border-gray-700 text-gray-900 dark:text-gray-100 dark:text-gray-100 focus:ring-gray-500 h-3.5 w-3.5 cursor-pointer"
                />
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-white dark:bg-gray-900 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 dark:border-gray-700"></div> Occupied</div>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none hover:opacity-80 transition-opacity">
                <input 
                  type="checkbox" 
                  checked={roomFilters.available}
                  onChange={(e) => setRoomFilters({...roomFilters, available: e.target.checked})}
                  className="rounded border-gray-300 dark:border-gray-700 dark:border-gray-700 text-green-600 focus:ring-green-500 h-3.5 w-3.5 cursor-pointer"
                />
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-green-50 border border-gray-300 dark:border-gray-700 dark:border-gray-700"></div> Available</div>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none hover:opacity-80 transition-opacity">
                <input 
                  type="checkbox" 
                  checked={roomFilters.maintenance}
                  onChange={(e) => setRoomFilters({...roomFilters, maintenance: e.target.checked})}
                  className="rounded border-gray-300 dark:border-gray-700 dark:border-gray-700 text-red-600 focus:ring-red-500 h-3.5 w-3.5 cursor-pointer"
                />
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-50 border border-red-300"></div> Maintenance</div>
              </label>
            </div>

            {/* Floor Facilities Display */}
            {selectedProperty?.floorFacilitiesLists?.[selectedFloor - 1] && selectedProperty.floorFacilitiesLists[selectedFloor - 1].length > 0 && (
              <div className="mt-8 border-t border-gray-200 dark:border-gray-800 dark:border-gray-800 pt-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100 mb-6 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm"><Building2 className="w-4 h-4" /></span>
                  Floor {selectedFloor} Facilities
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {selectedProperty.floorFacilitiesLists[selectedFloor - 1].map((facility: any, idx: number) => (
                    <div key={idx} className="bg-white dark:bg-gray-900 dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 dark:border-gray-800 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                      {facility.images && facility.images.length > 0 ? (
                        <div className="h-48 relative bg-gray-100 dark:bg-gray-800 dark:bg-gray-800 flex items-center justify-center border-b border-gray-100 dark:border-gray-800 dark:border-gray-800 overflow-hidden shrink-0">
                          <AutoCarousel images={facility.images} name={`Floor Facility ${idx + 1}`} />
                        </div>
                      ) : (
                        <div className="h-48 bg-gray-50 dark:bg-gray-950 dark:bg-gray-950 flex items-center justify-center text-gray-400 border-b border-gray-100 dark:border-gray-800 dark:border-gray-800 shrink-0">
                          No images available
                        </div>
                      )}
                      <div className="p-5 flex-1 flex flex-col bg-white dark:bg-gray-900 dark:bg-gray-900">
                        <p className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{facility.description || 'No description provided.'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      {/* Room Details Modal */}
      {selectedRoom && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white dark:bg-gray-900 dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-800 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 dark:bg-gray-950 shrink-0">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100">Room {selectedRoom.roomNum} Details</h2>
              <button onClick={() => { setSelectedRoom(null); setIsEditingRoom(false); }} className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 dark:hover:bg-gray-700 rounded-full p-1 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800 dark:border-gray-800">
                <span className="text-gray-500 dark:text-gray-400 dark:text-gray-400">Property</span>
                <span className="font-medium text-gray-900 dark:text-gray-100 dark:text-gray-100">{selectedProperty?.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800 dark:border-gray-800">
                <span className="text-gray-500 dark:text-gray-400 dark:text-gray-400">Floor</span>
                <span className="font-medium text-gray-900 dark:text-gray-100 dark:text-gray-100">{selectedFloor}</span>
              </div>
              
              {!isEditingRoom ? (
                <>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800 dark:border-gray-800">
                    <span className="text-gray-500 dark:text-gray-400 dark:text-gray-400">Status</span>
                    <span className={`font-semibold capitalize ${
                      selectedRoom.status === 'occupied' ? 'text-gray-700 dark:text-gray-300 dark:text-gray-300' :
                      selectedRoom.status === 'available' ? 'text-green-600' :
                      'text-red-600'
                    }`}>
                      {selectedRoom.status}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800 dark:border-gray-800">
                    <span className="text-gray-500 dark:text-gray-400 dark:text-gray-400">Total Beds</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100 dark:text-gray-100">{selectedRoom.beds} Bed{selectedRoom.beds !== 1 ? 's' : ''}</span>
                  </div>
                  
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800 dark:border-gray-800">
                    <span className="text-gray-500 dark:text-gray-400 dark:text-gray-400">Room Price</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100 dark:text-gray-100">{selectedRoom.roomPrice || 'Not set'}</span>
                  </div>
                  
                  <div className="py-3 border-b border-gray-100 dark:border-gray-800 dark:border-gray-800">
                    <span className="text-gray-500 dark:text-gray-400 dark:text-gray-400 mb-3 block font-medium">Room Facilities</span>
                    {selectedRoom.roomFacilitiesList && selectedRoom.roomFacilitiesList.length > 0 ? (
                      <div className="flex flex-col gap-4 mb-2">
                        {selectedRoom.roomFacilitiesList.map((facility, i) => (
                          <div key={i} className="flex flex-col gap-2 bg-gray-50 dark:bg-gray-950 dark:bg-gray-950 p-3 rounded-lg border border-gray-100 dark:border-gray-800 dark:border-gray-800">
                            {facility.description && (
                              <div className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300 whitespace-pre-line leading-relaxed font-medium">
                                {facility.description}
                              </div>
                            )}
                            {facility.images.length > 0 && (
                              <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1 pt-1">
                                {facility.images.map((img, imgIdx) => (
                                  <img key={imgIdx} src={img} alt={`Facility ${i + 1}`} onClick={() => setPreviewImage(img)} className="h-20 w-32 object-cover rounded-md border border-gray-200 dark:border-gray-800 dark:border-gray-800 shrink-0 cursor-pointer hover:opacity-90 transition-opacity shadow-sm" />
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (selectedRoom.roomFacilitiesImages && selectedRoom.roomFacilitiesImages.length > 0) ? (
                      <div className="flex flex-col gap-3 mb-2">
                        {selectedRoom.roomFacilitiesImages.map((img, i) => (
                          <div key={i} className="flex items-start gap-3 bg-gray-50 dark:bg-gray-950 dark:bg-gray-950 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800 dark:border-gray-800">
                            <img src={img} alt={`Facility ${i + 1}`} onClick={() => setPreviewImage(img)} className="h-16 w-24 object-cover rounded-md border border-gray-200 dark:border-gray-800 dark:border-gray-800 shrink-0 cursor-pointer hover:opacity-90 transition-opacity shadow-sm" />
                            <div className="flex-1 text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300 pt-0.5">
                                {selectedRoom.roomFacilitiesDescriptions?.[i] ? (
                                  <div className="whitespace-pre-line leading-relaxed">{selectedRoom.roomFacilitiesDescriptions[i]}</div>
                                ) : (
                                  <span className="text-gray-400 italic">No description</span>
                                )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400 italic mb-3">No facilities added</div>
                    )}
                  </div>
                  <div className="pt-4 mt-2 border-t border-gray-100 dark:border-gray-800 dark:border-gray-800">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-gray-700 dark:text-gray-300 dark:text-gray-300 font-bold text-base">Beds & Occupants</span>
                      <div className="text-xs font-semibold flex gap-3">
                        <span className="flex items-center gap-1.5 text-green-700 bg-green-50 px-2 py-1 rounded border border-green-200"><div className="w-2 h-2 rounded-full bg-green-500"></div> Free: {selectedRoom.freeBeds}</span>
                        <span className="flex items-center gap-1.5 text-red-700 bg-red-50 px-2 py-1 rounded border border-red-200"><div className="w-2 h-2 rounded-full bg-red-500"></div> Filled: {selectedRoom.filledBeds}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-2 pb-2 custom-scrollbar">
                      {Array.from({ length: selectedRoom.beds }).map((_, idx) => {
                        const bedLabel = String.fromCharCode(65 + idx);
                        const isFilled = selectedRoom.bedStatuses ? selectedRoom.bedStatuses[idx] : idx < (selectedRoom.filledBeds || 0);
                        let mockStudentName = isFilled ? (selectedRoom.bedOccupants?.[idx] || 'Unknown Student') : null;
                        let mockStudentId = 1;
                        if (mockStudentName && !isNaN(Number(mockStudentName))) {
                            const foundStudent = availableStudents.find(s => s.id.toString() === String(mockStudentName));
                            if (foundStudent) {
                                mockStudentId = foundStudent.id;
                                mockStudentName = foundStudent.name;
                            } else {
                                mockStudentName = 'Unknown Student';
                            }
                        } else if (mockStudentName) {
                            const foundStudent = availableStudents.find(s => s.name === mockStudentName);
                            if (foundStudent) {
                                mockStudentId = foundStudent.id;
                            }
                        }
                        const displayInitial = mockStudentName ? String(mockStudentName).charAt(0).toUpperCase() : '?';
                        
                        return (
                          <div key={idx} className={`flex flex-col p-4 rounded-xl border transition-all duration-200 ${isFilled ? 'bg-white dark:bg-gray-900 dark:bg-gray-900 border-gray-200 dark:border-gray-800 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-blue-300' : 'bg-green-50/40 border-green-200 border-dashed hover:bg-green-50'}`}>
                            <div className="flex justify-between items-center mb-3 border-b border-gray-100 dark:border-gray-800 dark:border-gray-800/50 pb-2">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${isFilled ? 'bg-red-500' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'}`}></div>
                                <span className="font-bold text-gray-800 dark:text-gray-200 dark:text-gray-200 text-sm">Bed {bedLabel}</span>
                                <button 
                                  onClick={(e) => handleShareBed(idx, e)}
                                  className="ml-1 p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                  title="Share Bed Details"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              {isFilled ? (
                                <span className="text-[9px] font-bold tracking-wider uppercase text-gray-500 dark:text-gray-400 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 dark:bg-gray-800 px-2 py-1 rounded-md">Occupied</span>
                              ) : (
                                <span className="text-[9px] font-bold tracking-wider uppercase text-green-700 bg-green-100 px-2 py-1 rounded-md">Free</span>
                              )}
                            </div>
                            
                            <div className="flex gap-2 mb-2 mt-1 overflow-x-auto custom-scrollbar pb-1">
                              {selectedRoom.bedImages && selectedRoom.bedImages[idx] && selectedRoom.bedImages[idx].filter(Boolean).length > 0 ? (
                                selectedRoom.bedImages[idx].filter(Boolean).map((imgUrl, i) => (
                                  <img key={i} src={imgUrl} alt={`Bed View ${i + 1}`} onClick={() => setPreviewImage(imgUrl)} className="h-20 w-32 object-cover rounded-lg border border-gray-200 dark:border-gray-800 dark:border-gray-800 shrink-0 cursor-pointer hover:opacity-90 transition-opacity" />
                                ))
                              ) : (
                                <div className="h-20 w-32 bg-gray-50 dark:bg-gray-950 dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 dark:border-gray-800 flex items-center justify-center text-gray-400 text-xs font-medium">
                                  No images
                                </div>
                              )}
                            </div>

                            {selectedRoom.bedDescriptions && selectedRoom.bedDescriptions[idx] && (
                              <div className="mb-3 text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300 bg-gray-50 dark:bg-gray-950 dark:bg-gray-950 p-2.5 rounded-lg border border-gray-200 dark:border-gray-800 dark:border-gray-800">
                                {selectedRoom.bedDescriptions[idx]}
                              </div>
                            )}

                              {isFilled ? (
                                mockStudentName === 'Unknown Student' ? (
                                  <div className="flex items-center gap-3 mt-1 p-1.5 -mx-1.5 rounded-lg">
                                    <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 dark:bg-gray-800 text-gray-500 dark:text-gray-400 dark:text-gray-400 flex items-center justify-center font-bold text-sm shadow-sm">
                                      {displayInitial}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-sm font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100">{String(mockStudentName)}</span>
                                      <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 font-medium mt-0.5">No profile available</span>
                                    </div>
                                  </div>
                                ) : (
                                  <Link 
                                    href={`/staff/students/${mockStudentId}?from=properties`}
                                    onClick={() => sessionStorage.setItem('hms_return_room', JSON.stringify(selectedRoom))}
                                    className="flex items-center gap-3 mt-1 cursor-pointer group p-1.5 -mx-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-950 dark:hover:bg-gray-800 dark:bg-gray-950 transition-colors"
                                  >
                                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm">
                                      {displayInitial}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-sm font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100 group-hover:text-blue-600 transition-colors">{String(mockStudentName)}</span>
                                      <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 font-medium mt-0.5 group-hover:text-blue-500">View Details &rarr;</span>
                                    </div>
                                  </Link>
                                )
                              ) : (
                              <div className="flex items-center gap-3 mt-1 opacity-70 p-1.5 -mx-1.5">
                                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
                                  <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                                <span className="text-sm font-semibold text-green-700">Ready for booking</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800 dark:border-gray-800">
                    <span className="text-gray-500 dark:text-gray-400 dark:text-gray-400">Status</span>
                    <select 
                      value={editRoomData.status}
                      onChange={(e) => setEditRoomData({...editRoomData, status: e.target.value})}
                      className="border border-gray-300 dark:border-gray-700 dark:border-gray-700 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="available">Available</option>
                      <option value="occupied">Occupied</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800 dark:border-gray-800">
                    <span className="text-gray-500 dark:text-gray-400 dark:text-gray-400">Total Beds</span>
                    <input 
                      type="number"
                      value={editRoomData.beds}
                      onChange={(e) => {
                        const newTotal = parseInt(e.target.value) || 0;
                        const newBedStatuses = Array.from({ length: newTotal }, (_, i) => 
                          i < editRoomData.bedStatuses.length ? editRoomData.bedStatuses[i] : false
                        );
                        const newBedOccupants = Array.from({ length: newTotal }, (_, i) => 
                          i < editRoomData.bedOccupants.length ? editRoomData.bedOccupants[i] : null
                        );
                        const newBedImages = Array.from({ length: newTotal }, (_, i) => 
                          i < editRoomData.bedImages.length ? editRoomData.bedImages[i] : []
                        );
                        const newBedDescriptions = Array.from({ length: newTotal }, (_, i) => 
                          i < editRoomData.bedDescriptions.length ? editRoomData.bedDescriptions[i] : ''
                        );
                        const newFilled = newBedStatuses.filter(v => v).length;
                        const newFree = newTotal - newFilled;
                        
                        setEditRoomData(prev => {
                          let newStatus = prev.status;
                          if (newFilled === newTotal && newTotal > 0) {
                            newStatus = 'occupied';
                          } else if (newFree > 0 && prev.status !== 'maintenance') {
                            newStatus = 'available';
                          }
                          return {
                            ...prev, 
                            beds: newTotal, 
                            bedStatuses: newBedStatuses,
                            bedOccupants: newBedOccupants,
                            bedImages: newBedImages,
                            bedDescriptions: newBedDescriptions,
                            filledBeds: newFilled,
                            freeBeds: newFree,
                            status: newStatus
                          };
                        });
                      }}
                      className="w-20 border border-gray-300 dark:border-gray-700 dark:border-gray-700 rounded-lg px-2 py-1 text-sm text-right focus:ring-2 focus:ring-blue-500 outline-none"
                      min="1" max="10"
                    />
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800 dark:border-gray-800">
                    <span className="text-gray-500 dark:text-gray-400 dark:text-gray-400">Room Price</span>
                    <input 
                      type="text"
                      placeholder="e.g. 500"
                      value={editRoomData.roomPrice || ''}
                      onChange={(e) => setEditRoomData({...editRoomData, roomPrice: e.target.value})}
                      className="w-32 border border-gray-300 dark:border-gray-700 dark:border-gray-700 rounded-lg px-2 py-1 text-sm text-right focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div className="pt-3 pb-2 border-b border-gray-100 dark:border-gray-800 dark:border-gray-800">
                    <span className="text-gray-500 dark:text-gray-400 dark:text-gray-400 font-medium mb-3 block">Room Facilities</span>
                    
                    <div className="space-y-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 font-semibold">Facilities</span>
                          <button onClick={() => {
                            setEditRoomData(prev => ({
                              ...prev,
                              roomFacilitiesList: [...prev.roomFacilitiesList, { images: [], description: '' }]
                            }));
                          }} className="text-xs text-blue-600 font-medium flex items-center gap-1 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded">
                            <Plus className="w-3.5 h-3.5" /> Add Facility
                          </button>
                        </div>
                        {editRoomData.roomFacilitiesList.map((facility, fIdx) => (
                          <div key={fIdx} className="flex flex-col gap-2 bg-gray-50 dark:bg-gray-950 dark:bg-gray-950 p-3 border border-gray-200 dark:border-gray-800 dark:border-gray-800 rounded-lg">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 dark:text-gray-400">Facility {fIdx + 1}</span>
                              <button onClick={() => {
                                const newList = editRoomData.roomFacilitiesList.filter((_, i) => i !== fIdx);
                                setEditRoomData({...editRoomData, roomFacilitiesList: newList});
                              }} className="text-red-400 hover:text-red-600 p-1 shrink-0">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            
                            <textarea 
                              className="w-full border border-gray-200 dark:border-gray-800 dark:border-gray-800 bg-white dark:bg-gray-900 dark:bg-gray-900 p-2 text-xs text-gray-700 dark:text-gray-300 dark:text-gray-300 focus:ring-1 focus:ring-blue-300 outline-none rounded resize-none mb-1" 
                              rows={2}
                              value={facility.description} 
                              placeholder="Add description for this facility group (e.g. Washroom)..."
                              onChange={(e) => {
                                const newList = [...editRoomData.roomFacilitiesList];
                                newList[fIdx].description = e.target.value;
                                setEditRoomData({...editRoomData, roomFacilitiesList: newList});
                              }} 
                            />
                            
                            {facility.images.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-2">
                                {facility.images.map((img, imgIdx) => (
                                  <div key={imgIdx} className="relative group">
                                    <img src={img} alt="facility" className="h-12 w-20 object-cover rounded border border-gray-200 dark:border-gray-800 dark:border-gray-800" />
                                    <button onClick={() => {
                                      const newList = [...editRoomData.roomFacilitiesList];
                                      newList[fIdx].images = newList[fIdx].images.filter((_, i) => i !== imgIdx);
                                      setEditRoomData({...editRoomData, roomFacilitiesList: newList});
                                    }} className="absolute -top-1.5 -right-1.5 bg-white dark:bg-gray-900 dark:bg-gray-900 rounded-full text-red-500 shadow hover:text-red-700 p-0.5 hidden group-hover:block">
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            <div className="flex items-center">
                              <input 
                                type="file" 
                                accept="image/*"
                                id={`room-facility-upload-${fIdx}`}
                                className="hidden"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const formData = new FormData();
                                        formData.append('file', file);
                                        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default';
                                        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
                                        formData.append('upload_preset', uploadPreset);
                                        
                                        try {
                                            const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                                                method: 'POST',
                                                body: formData
                                            });
                                            const data = await res.json();
                                            if (data.secure_url) {
                                                const newList = [...editRoomData.roomFacilitiesList];
                                                newList[fIdx].images.push(data.secure_url);
                                                setEditRoomData(prev => ({ ...prev, roomFacilitiesList: newList }));
                                            }
                                        } catch (err) {
                                            console.error('Upload failed', err);
                                        }
                                    }
                                }}
                              />
                              <label 
                                htmlFor={`room-facility-upload-${fIdx}`}
                                className="text-xs text-blue-600 font-semibold hover:text-blue-800 cursor-pointer flex items-center justify-center gap-1.5 border border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 w-full py-1.5 rounded-lg transition-colors"
                              >
                                <Upload className="w-3.5 h-3.5" /> Add Image to this Facility
                              </label>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
                  
                  <div className="pt-2 pb-1">
                    <span className="text-gray-500 dark:text-gray-400 dark:text-gray-400 font-medium mb-3 block">Bed Assignments</span>
                    <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto pr-2 pb-2 custom-scrollbar">
                      {editRoomData.bedStatuses.map((isFilled, idx) => {
                        const bedLabel = String.fromCharCode(65 + idx);
                        let occupant = editRoomData.bedOccupants[idx];
                        if (occupant && !isNaN(Number(occupant))) {
                            const foundStudent = availableStudents.find(s => s.id.toString() === String(occupant));
                            if (foundStudent) occupant = foundStudent.name;
                        }
                        
                        return (
                          <div key={idx} className="flex flex-col gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-800 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 dark:bg-gray-950">
                            <div className="flex justify-between items-center relative">
                              <span className="font-bold text-gray-700 dark:text-gray-300 dark:text-gray-300">Bed {bedLabel}</span>
                              {isFilled && occupant ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 dark:text-gray-100">{occupant}</span>
                                  <button 
                                    onClick={() => {
                                      const removedOccupantId = editRoomData.bedOccupants[idx];
                                      const newStatuses = [...editRoomData.bedStatuses];
                                      const newOccupants = [...editRoomData.bedOccupants];
                                      newStatuses[idx] = false;
                                      newOccupants[idx] = null;
                                      
                                      const newFilled = newStatuses.filter(v => v).length;
                                      setEditRoomData(prev => {
                                        const newFree = prev.beds - newFilled;
                                        let newStatus = prev.status;
                                        if (newFilled === prev.beds && prev.beds > 0) {
                                          newStatus = 'occupied';
                                        } else if (newFree > 0 && prev.status !== 'maintenance') {
                                          newStatus = 'available';
                                        }
                                        return { ...prev, bedStatuses: newStatuses, bedOccupants: newOccupants, filledBeds: newFilled, freeBeds: newFree, status: newStatus };
                                      });
                                    }}
                                    className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <div>
                                  <button 
                                    onClick={() => {
                                      setActiveSearchBed(activeSearchBed === idx ? null : idx);
                                      setStudentSearchQuery('');
                                    }}
                                    className="text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors"
                                  >
                                    Assign Student
                                  </button>
                                  
                                  {activeSearchBed === idx && (
                                    <>
                                      <div className="fixed inset-0 z-[55]" onClick={(e) => { e.stopPropagation(); setActiveSearchBed(null); }}></div>
                                      <div className="absolute right-0 top-10 w-64 bg-white dark:bg-gray-900 dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-800 dark:border-gray-800 z-[60] p-2">
                                        <div className="relative mb-2">
                                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                          <input 
                                            type="text" 
                                            placeholder="Search students..." 
                                            value={studentSearchQuery}
                                            onChange={e => setStudentSearchQuery(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-950 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 dark:border-gray-800 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            autoFocus
                                          />
                                        </div>
                                        <Link
                                          href={`/staff/students/add?from_room=${selectedRoom.roomNum}&bed=${idx}&property_id=${selectedPropertyId}&floor=${selectedFloor}`}
                                          onClick={() => {
                                            sessionStorage.setItem('hms_return_room_edit', JSON.stringify({ room: selectedRoom, editData: editRoomData, activeSearchBed: idx, propertyId: selectedPropertyId, floor: selectedFloor }));
                                          }}
                                          className="w-full flex items-center justify-center gap-1.5 mb-2 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                                        >
                                          <Plus className="w-4 h-4" /> Add Student
                                        </Link>
                                        <div className="max-h-40 overflow-y-auto custom-scrollbar relative z-10">
                                          {availableStudents.filter(s => s.name.toLowerCase().includes(studentSearchQuery.toLowerCase())).map(student => {
                                            let isAssigned = false;
                                            let assignmentText = "";
                                            
                                            const isAssignedLocally = editRoomData.bedOccupants.some(id => id && id.toString() === student.id.toString());
                                            if (isAssignedLocally) {
                                                isAssigned = true;
                                                const localIdx = editRoomData.bedOccupants.findIndex(id => id && id.toString() === student.id.toString());
                                                assignmentText = `Assigned to: this room • Bed ${String.fromCharCode(65 + localIdx)}`;
                                            } else if (student.room && student.room !== 'Unassigned') {
                                                const isThisRoom = student.property === selectedProperty?.name && student.room.includes(`Room ${selectedRoom.roomNum} -`);
                                                if (!isThisRoom) {
                                                    isAssigned = true;
                                                    assignmentText = `Assigned to: ${student.property} • ${student.room}`;
                                                }
                                            }

                                            return (
                                              <button
                                                key={student.id}
                                                disabled={isAssigned}
                                                onClick={() => {
                                                  const newStatuses = [...editRoomData.bedStatuses];
                                                  const newOccupants = [...editRoomData.bedOccupants];
                                                  newStatuses[idx] = true;
                                                  newOccupants[idx] = student.id;

                                                  const newFilled = newStatuses.filter(v => v).length;
                                                  setEditRoomData(prev => {
                                                    const newFree = prev.beds - newFilled;
                                                    let newStatus = prev.status;
                                                    if (newFilled === prev.beds && prev.beds > 0) {
                                                      newStatus = 'occupied';
                                                    } else if (newFree > 0 && prev.status !== 'maintenance') {
                                                      newStatus = 'available';
                                                    }
                                                    return { ...prev, bedStatuses: newStatuses, bedOccupants: newOccupants, filledBeds: newFilled, freeBeds: newFree, status: newStatus };
                                                  });
                                                  setActiveSearchBed(null);
                                                }}
                                                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${isAssigned ? 'bg-gray-50 dark:bg-gray-950 dark:bg-gray-950 text-gray-500 dark:text-gray-400 dark:text-gray-400 cursor-not-allowed opacity-80' : 'hover:bg-blue-50 text-gray-700 dark:text-gray-300 dark:text-gray-300 hover:text-blue-700'}`}
                                              >
                                                <div className={`font-semibold ${isAssigned ? 'text-gray-500 dark:text-gray-400 dark:text-gray-400' : ''}`}>{student.name}</div>
                                                {isAssigned ? (
                                                  <div className="text-[10px] text-red-500 font-medium mt-1">
                                                    {assignmentText}
                                                  </div>
                                                ) : (
                                                  <div className="text-[10px] text-gray-500 dark:text-gray-400 dark:text-gray-400">{student.course}</div>
                                                )}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {/* Images Edit Section */}
                            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 dark:border-gray-800">
                              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-400 block mb-2">Bed Images</span>
                              <div className="flex flex-col gap-2">
                                {editRoomData.bedImages[idx]?.map((imgUrl, imgIdx) => (
                                  <div key={imgIdx} className="flex items-center gap-2">
                                    {imgUrl ? (
                                      <img src={imgUrl} onClick={() => setPreviewImage(imgUrl)} className="w-8 h-8 object-cover rounded bg-gray-200 shrink-0 cursor-pointer hover:opacity-80 transition-opacity" />
                                    ) : (
                                      <div className="w-8 h-8 rounded bg-gray-100 dark:bg-gray-800 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 dark:border-gray-800 shrink-0 flex items-center justify-center text-gray-400">
                                        <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-700 dark:border-gray-700"></div>
                                      </div>
                                    )}
                                    <input 
                                      type="text"
                                      placeholder="Image URL..."
                                      value={imgUrl}
                                      onChange={(e) => {
                                        const newImages = [...editRoomData.bedImages];
                                        if (!newImages[idx]) newImages[idx] = [];
                                        const newRow = [...newImages[idx]];
                                        newRow[imgIdx] = e.target.value;
                                        newImages[idx] = newRow;
                                        setEditRoomData(prev => ({ ...prev, bedImages: newImages }));
                                      }}
                                      className="flex-1 border border-gray-300 dark:border-gray-700 dark:border-gray-700 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                    />
                                    <button onClick={() => {
                                        const newImages = [...editRoomData.bedImages];
                                        newImages[idx] = newImages[idx].filter((_, i) => i !== imgIdx);
                                        setEditRoomData(prev => ({ ...prev, bedImages: newImages }));
                                    }} className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors" title="Remove Image">
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                                {(!editRoomData.bedImages[idx] || editRoomData.bedImages[idx].length < 2) && (
                                  <div className="flex gap-2 mt-1">
                                    <button 
                                      onClick={() => {
                                        const newImages = [...editRoomData.bedImages];
                                        if (!newImages[idx]) newImages[idx] = [];
                                        const newRow = [...newImages[idx]];
                                        newRow.push('');
                                        newImages[idx] = newRow;
                                        
                                        setEditRoomData(prev => ({ ...prev, bedImages: newImages }));
                                      }}
                                      className="text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors flex items-center gap-1"
                                    >
                                      <Plus className="w-3 h-3" /> URL
                                    </button>
                                    <label className="text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer">
                                      <Upload className="w-3 h-3" /> Upload File
                                      <input 
                                        type="file" 
                                        accept="image/*"
                                        className="hidden"
                                        disabled={isUploading}
                                        onChange={async (e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
                                            const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
                                            
                                            if (!cloudName || !uploadPreset) {
                                              alert("Cloudinary credentials are not configured. Please restart the dev server.");
                                              return;
                                            }

                                            setIsUploading(true);
                                            const formData = new FormData();
                                            formData.append('file', file);
                                            formData.append('upload_preset', uploadPreset);

                                            try {
                                              const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                                                method: 'POST',
                                                body: formData,
                                              });
                                              const data = await res.json();
                                              if (data.secure_url) {
                                                setEditRoomData(prev => {
                                                  const newImages = [...prev.bedImages];
                                                  if (!newImages[idx]) newImages[idx] = [];
                                                  const newRow = [...newImages[idx]];
                                                  newRow.push(data.secure_url);
                                                  newImages[idx] = newRow;
                                                  
                                                  return { ...prev, bedImages: newImages };
                                                });
                                              } else {
                                                console.error("Upload failed:", data);
                                                alert("Failed to upload image to Cloudinary.");
                                              }
                                            } catch (error) {
                                              console.error("Error uploading to Cloudinary:", error);
                                              alert("Error uploading image.");
                                            } finally {
                                              setIsUploading(false);
                                              // Reset the input so the same file can be uploaded again if needed
                                              e.target.value = '';
                                            }
                                          }
                                        }}
                                      />
                                    </label>
                                    {isUploading && <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 self-center ml-2">Uploading...</span>}
                                  </div>
                                )}
                              </div>
                              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 dark:border-gray-800">
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-400 block mb-2">Bed Description</span>
                                <textarea
                                  placeholder={`Description for Bed ${String.fromCharCode(65 + idx)}...`}
                                  value={editRoomData.bedDescriptions?.[idx] || ''}
                                  onChange={(e) => {
                                    const newDescriptions = [...(editRoomData.bedDescriptions || [])];
                                    newDescriptions[idx] = e.target.value;
                                    setEditRoomData(prev => ({ ...prev, bedDescriptions: newDescriptions }));
                                  }}
                                  className="w-full border border-gray-300 dark:border-gray-700 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white dark:bg-gray-900 dark:bg-gray-900"
                                  rows={2}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800 dark:border-gray-800">
                    <span className="text-gray-500 dark:text-gray-400 dark:text-gray-400">Free Beds</span>
                    <div className="text-right">
                      <span className="font-medium text-green-600">{editRoomData.freeBeds}</span>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {editRoomData.bedStatuses.map((filled, i) => !filled ? String.fromCharCode(65 + i) : null).filter(Boolean).join(', ') || 'None'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800 dark:border-gray-800">
                    <span className="text-gray-500 dark:text-gray-400 dark:text-gray-400">Filled Beds</span>
                    <div className="text-right">
                      <span className="font-medium text-red-600">{editRoomData.filledBeds}</span>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {editRoomData.bedStatuses.map((filled, i) => filled ? String.fromCharCode(65 + i) : null).filter(Boolean).join(', ') || 'None'}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-950 dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 dark:border-gray-800 flex gap-3 shrink-0">
              <button 
                onClick={() => { setSelectedRoom(null); setIsEditingRoom(false); }}
                className="flex-1 bg-gray-100 dark:bg-gray-800 dark:bg-gray-800 text-gray-700 dark:text-gray-300 dark:text-gray-300 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-800 dark:border-gray-800"
              >
                Close
              </button>
              {!isEditingRoom ? (
                <button 
                  onClick={handleEditRoomStart}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Edit Room
                </button>
              ) : (
                <button 
                  onClick={handleSaveRoomEdit}
                  disabled={isUploading || editRoomData.freeBeds < 0 || editRoomData.filledBeds < 0 || editRoomData.freeBeds > editRoomData.beds || editRoomData.filledBeds > editRoomData.beds}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 className="h-4 w-4" /> {isUploading ? 'Uploading...' : 'Save'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Property Modal */}
      {isAddPropertyModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white dark:bg-gray-900 dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-800 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 dark:bg-gray-950 shrink-0">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100">Add New Property</h2>
              <button onClick={() => setIsAddPropertyModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 dark:hover:bg-gray-700 rounded-full p-1 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300">Property Name</label>
                <input 
                  type="text" 
                  value={newProperty.name}
                  onChange={(e) => setNewProperty({...newProperty, name: e.target.value})}
                  className="w-full border border-gray-300 dark:border-gray-700 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                  placeholder="e.g. University View" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300">Location / Address</label>
                <input 
                  type="text" 
                  value={newProperty.location}
                  onChange={(e) => setNewProperty({...newProperty, location: e.target.value})}
                  className="w-full border border-gray-300 dark:border-gray-700 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                  placeholder="e.g. North Campus" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300">Property Images (Up to 5)</label>
                <div className="flex flex-wrap gap-2">
                  {newProperty.images.map((img, idx) => (
                    <div key={idx} className="relative h-16 w-16 rounded-md overflow-hidden border border-gray-200 dark:border-gray-800 dark:border-gray-800">
                      <img src={img} alt="" className="h-full w-full object-cover" />
                      <button
                        onClick={() => {
                          const newImages = [...newProperty.images];
                          newImages.splice(idx, 1);
                          setNewProperty({...newProperty, images: newImages});
                        }}
                        className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5 hover:bg-red-500 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {newProperty.images.length < 5 && (
                    <label className="h-16 w-16 border-2 border-dashed border-gray-300 dark:border-gray-700 dark:border-gray-700 rounded-md flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-950 dark:hover:bg-gray-800 dark:bg-gray-950 transition-colors">
                      {isUploading ? (
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 text-gray-400" />
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 dark:text-gray-400 mt-1">Upload</span>
                        </>
                      )}
                      <input 
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={isUploading}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
                            const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
                            if (!cloudName || !uploadPreset) {
                              alert("Cloudinary credentials missing");
                              return;
                            }
                            setIsUploading(true);
                            const formData = new FormData();
                            formData.append('file', file);
                            formData.append('upload_preset', uploadPreset);
                            try {
                              const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                                method: 'POST',
                                body: formData,
                              });
                              const data = await res.json();
                              if (data.secure_url) {
                                setNewProperty({...newProperty, images: [...newProperty.images, data.secure_url]});
                              }
                            } catch (error) {
                              console.error("Upload failed");
                            } finally {
                              setIsUploading(false);
                              e.target.value = '';
                            }
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300">Total Rooms</label>
                  <input 
                    type="number" 
                    readOnly value={newProperty.roomsPerFloor.reduce((acc, curr) => acc + (parseInt(curr) || 0), 0)}
                    className="w-full border border-gray-300 dark:border-gray-700 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-gray-950 dark:bg-gray-950 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none cursor-not-allowed" 
                    placeholder="0" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300">Floors</label>
                  <input 
                    type="number" 
                    value={newProperty.floors}
                    onChange={(e) => {
                      const newFloors = parseInt(e.target.value) || 1;
                      let newRoomsPerFloor = [...newProperty.roomsPerFloor];
                      let newBedsPerFloor = [...newProperty.bedsPerFloor];
                      if (newFloors > newRoomsPerFloor.length) {
                        for (let i = newRoomsPerFloor.length; i < newFloors; i++) {
                          newRoomsPerFloor.push('0');
                          newBedsPerFloor.push(newProperty.beds);
                        }
                      } else if (newFloors < newRoomsPerFloor.length && newFloors > 0) {
                        newRoomsPerFloor.length = newFloors;
                        newBedsPerFloor.length = newFloors;
                      }
                      setNewProperty({...newProperty, floors: e.target.value, roomsPerFloor: newRoomsPerFloor, bedsPerFloor: newBedsPerFloor});
                    }}
                    className="w-full border border-gray-300 dark:border-gray-700 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                    placeholder="1" 
                  />
                </div>
              </div>

              <div className="space-y-3 mt-4 border-t border-gray-100 dark:border-gray-800 dark:border-gray-800 pt-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300">Rooms per Floor</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {newProperty.roomsPerFloor.map((rooms, idx) => (
                    <div key={idx} className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400">Floor {idx + 1}</span>
                      <input 
                        type="number" 
                        value={rooms}
                        onChange={(e) => {
                          const newRooms = [...newProperty.roomsPerFloor];
                          newRooms[idx] = e.target.value;
                          setNewProperty({...newProperty, roomsPerFloor: newRooms});
                        }}
                        className="w-full border border-gray-300 dark:border-gray-700 dark:border-gray-700 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mt-4 border-t border-gray-100 dark:border-gray-800 dark:border-gray-800 pt-4">
                <div className="flex items-center mb-3">
                  <input 
                    type="checkbox" 
                    id="newProperty_customBeds"
                    checked={newProperty.isCustomBedsPerFloor}
                    onChange={(e) => setNewProperty({...newProperty, isCustomBedsPerFloor: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-700 dark:border-gray-700 rounded"
                  />
                  <label htmlFor="newProperty_customBeds" className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300">
                    Specify beds per floor
                  </label>
                </div>
                
                {newProperty.isCustomBedsPerFloor && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-3 animate-in fade-in slide-in-from-top-2">
                    {newProperty.bedsPerFloor.map((beds, idx) => (
                      <div key={idx} className="flex flex-col gap-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400">Floor {idx + 1} Beds</span>
                        <input 
                          type="number" 
                          value={beds}
                          onChange={(e) => {
                            const newBeds = [...newProperty.bedsPerFloor];
                            newBeds[idx] = e.target.value;
                            setNewProperty({...newProperty, bedsPerFloor: newBeds});
                          }}
                          className="w-full border border-gray-300 dark:border-gray-700 dark:border-gray-700 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-950 dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 dark:border-gray-800 flex gap-3 shrink-0">
              <button 
                onClick={() => setIsAddPropertyModalOpen(false)}
                className="flex-1 bg-gray-100 dark:bg-gray-800 dark:bg-gray-800 text-gray-700 dark:text-gray-300 dark:text-gray-300 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddProperty}
                disabled={!newProperty.name || !newProperty.location}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Property
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Property Modal */}
      {editingPropertyId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white dark:bg-gray-900 dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-800 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 dark:bg-gray-950 shrink-0">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100">Edit Property</h2>
              <button onClick={() => setEditingPropertyId(null)} className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 dark:hover:bg-gray-700 rounded-full p-1 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300">Property Name</label>
                <input 
                  type="text" 
                  value={editPropertyForm.name}
                  onChange={(e) => setEditPropertyForm({...editPropertyForm, name: e.target.value})}
                  className="w-full border border-gray-300 dark:border-gray-700 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                  placeholder="e.g. University View" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300">Location / Address</label>
                <input 
                  type="text" 
                  value={editPropertyForm.location}
                  onChange={(e) => setEditPropertyForm({...editPropertyForm, location: e.target.value})}
                  className="w-full border border-gray-300 dark:border-gray-700 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                  placeholder="e.g. North Campus" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300">Property Images (Up to 5)</label>
                <div className="flex flex-wrap gap-2">
                  {editPropertyForm.images.map((img, idx) => (
                    <div key={idx} className="relative h-16 w-16 rounded-md overflow-hidden border border-gray-200 dark:border-gray-800 dark:border-gray-800">
                      <img src={img} alt="" className="h-full w-full object-cover" />
                      <button
                        onClick={() => {
                          const newImages = [...editPropertyForm.images];
                          newImages.splice(idx, 1);
                          setEditPropertyForm({...editPropertyForm, images: newImages});
                        }}
                        className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5 hover:bg-red-500 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {editPropertyForm.images.length < 5 && (
                    <label className="h-16 w-16 border-2 border-dashed border-gray-300 dark:border-gray-700 dark:border-gray-700 rounded-md flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-950 dark:hover:bg-gray-800 dark:bg-gray-950 transition-colors">
                      {isUploading ? (
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 text-gray-400" />
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 dark:text-gray-400 mt-1">Upload</span>
                        </>
                      )}
                      <input 
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={isUploading}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
                            const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
                            if (!cloudName || !uploadPreset) {
                              alert("Cloudinary credentials missing");
                              return;
                            }
                            setIsUploading(true);
                            const formData = new FormData();
                            formData.append('file', file);
                            formData.append('upload_preset', uploadPreset);
                            try {
                              const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                                method: 'POST',
                                body: formData,
                              });
                              const data = await res.json();
                              if (data.secure_url) {
                                setEditPropertyForm({...editPropertyForm, images: [...editPropertyForm.images, data.secure_url]});
                              }
                            } catch (error) {
                              console.error("Upload failed");
                            } finally {
                              setIsUploading(false);
                              e.target.value = '';
                            }
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300">Total Rooms</label>
                  <input 
                    type="number" 
                    readOnly value={editPropertyForm.roomsPerFloor.reduce((acc, curr) => acc + (parseInt(curr) || 0), 0)}
                    className="w-full border border-gray-300 dark:border-gray-700 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-gray-950 dark:bg-gray-950 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none cursor-not-allowed" 
                    placeholder="0" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300">Floors</label>
                  <input 
                    type="number" 
                    value={editPropertyForm.floors}
                    onChange={(e) => {
                      const newFloors = parseInt(e.target.value) || 1;
                      let newRoomsPerFloor = [...editPropertyForm.roomsPerFloor];
                      let newBedsPerFloor = [...editPropertyForm.bedsPerFloor];
                      if (newFloors > newRoomsPerFloor.length) {
                        for (let i = newRoomsPerFloor.length; i < newFloors; i++) {
                          newRoomsPerFloor.push('0');
                          newBedsPerFloor.push(editPropertyForm.beds);
                        }
                      } else if (newFloors < newRoomsPerFloor.length && newFloors > 0) {
                        newRoomsPerFloor.length = newFloors;
                        newBedsPerFloor.length = newFloors;
                      }
                      setEditPropertyForm({...editPropertyForm, floors: e.target.value, roomsPerFloor: newRoomsPerFloor, bedsPerFloor: newBedsPerFloor});
                    }}
                    className="w-full border border-gray-300 dark:border-gray-700 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                    placeholder="1" 
                  />
                </div>
              </div>

              <div className="space-y-3 mt-4 border-t border-gray-100 dark:border-gray-800 dark:border-gray-800 pt-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300">Rooms per Floor</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {editPropertyForm.roomsPerFloor.map((rooms, idx) => (
                    <div key={idx} className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400">Floor {idx + 1}</span>
                      <input 
                        type="number" 
                        value={rooms}
                        onChange={(e) => {
                          const newRooms = [...editPropertyForm.roomsPerFloor];
                          newRooms[idx] = e.target.value;
                          setEditPropertyForm({...editPropertyForm, roomsPerFloor: newRooms});
                        }}
                        className="w-full border border-gray-300 dark:border-gray-700 dark:border-gray-700 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mt-4 border-t border-gray-100 dark:border-gray-800 dark:border-gray-800 pt-4">
                <div className="flex items-center mb-3">
                  <input 
                    type="checkbox" 
                    id="editPropertyForm_customBeds"
                    checked={editPropertyForm.isCustomBedsPerFloor}
                    onChange={(e) => setEditPropertyForm({...editPropertyForm, isCustomBedsPerFloor: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-700 dark:border-gray-700 rounded"
                  />
                  <label htmlFor="editPropertyForm_customBeds" className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300">
                    Specify beds per floor
                  </label>
                </div>
                
                {editPropertyForm.isCustomBedsPerFloor && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-3 animate-in fade-in slide-in-from-top-2">
                    {editPropertyForm.bedsPerFloor.map((beds, idx) => (
                      <div key={idx} className="flex flex-col gap-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400">Floor {idx + 1} Beds</span>
                        <input 
                          type="number" 
                          value={beds}
                          onChange={(e) => {
                            const newBeds = [...editPropertyForm.bedsPerFloor];
                            newBeds[idx] = e.target.value;
                            setEditPropertyForm({...editPropertyForm, bedsPerFloor: newBeds});
                          }}
                          className="w-full border border-gray-300 dark:border-gray-700 dark:border-gray-700 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-950 dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 dark:border-gray-800 flex gap-3 shrink-0">
              <button 
                onClick={() => setEditingPropertyId(null)}
                className="flex-1 bg-gray-100 dark:bg-gray-800 dark:bg-gray-800 text-gray-700 dark:text-gray-300 dark:text-gray-300 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleUpdateProperty}
                disabled={!editPropertyForm.name || !editPropertyForm.location}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Update Property
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {propertyToDelete !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100">Delete Property?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                  Are you sure you want to delete <span className="font-semibold text-gray-700 dark:text-gray-300 dark:text-gray-300">{properties.find(p => p.id === propertyToDelete)?.name}</span>? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-950 dark:bg-gray-950 flex gap-3">
              <button 
                onClick={() => setPropertyToDelete(null)}
                className="flex-1 bg-white dark:bg-gray-900 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 dark:border-gray-700 text-gray-700 dark:text-gray-300 dark:text-gray-300 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-950 dark:hover:bg-gray-800 dark:bg-gray-950 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteProperty}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Student Details Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 dark:bg-gray-950 dark:bg-gray-950">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 dark:text-gray-200">Occupant Details</h3>
              <button onClick={() => setSelectedStudent(null)} className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:text-gray-400 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold">
                  {selectedStudent.name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100">{selectedStudent.name}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">Room {selectedStudent.room} • Bed {selectedStudent.bed}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider font-semibold">Course</span>
                  <span className="text-gray-800 dark:text-gray-200 dark:text-gray-200 font-medium mt-0.5">{selectedStudent.course}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider font-semibold">Phone</span>
                  <span className="text-gray-800 dark:text-gray-200 dark:text-gray-200 font-medium mt-0.5">{selectedStudent.phone}</span>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 dark:border-gray-800">
                <button onClick={() => setSelectedStudent(null)} className="w-full bg-gray-100 dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 dark:text-gray-200 font-medium py-2 rounded-lg transition-colors">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Floor Modal */}
      {isEditFloorModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 dark:bg-gray-900 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800 dark:border-gray-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100">Edit Floor {editFloorData.floor} Details</h2>
              <button onClick={() => setIsEditFloorModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:text-gray-400 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-800 p-1.5 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">Floor Name (Optional)</label>
                  <input
                    type="text"
                    value={editFloorData.name}
                    onChange={e => setEditFloorData({ ...editFloorData, name: e.target.value })}
                    placeholder="e.g. Ground Floor, VIP Wing"
                    className="w-full border border-gray-300 dark:border-gray-700 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">Number of Rooms on this Floor</label>
                  <input
                    type="number"
                    min="0"
                    value={editFloorData.rooms}
                    onChange={e => setEditFloorData({ ...editFloorData, rooms: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 dark:border-gray-700 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">Default Beds per Room</label>
                  <input
                    type="number"
                    min="1"
                    value={editFloorData.beds}
                    onChange={e => setEditFloorData({ ...editFloorData, beds: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 dark:border-gray-700 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">Floor Layout / Map (Optional)</label>
                  <div className="flex items-center gap-3">
                    {editFloorData.image && (
                      <div className="relative">
                        <img src={editFloorData.image} alt="Floor map" onClick={() => setPreviewImage(editFloorData.image)} className="h-16 w-24 object-cover rounded border border-gray-200 dark:border-gray-800 dark:border-gray-800 cursor-pointer hover:opacity-80 transition-opacity" />
                        <button onClick={() => setEditFloorData({ ...editFloorData, image: '' })} className="absolute -top-1.5 -right-1.5 bg-white dark:bg-gray-900 dark:bg-gray-900 text-red-500 rounded-full shadow hover:text-red-700 p-0.5">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <label className="flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-gray-300 dark:border-gray-700 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 dark:text-gray-400 hover:text-blue-600 hover:border-blue-400 cursor-pointer transition-colors bg-gray-50 dark:bg-gray-950 dark:bg-gray-950 flex-1">
                      <Upload className="w-4 h-4" /> {editFloorData.image ? 'Change Image' : 'Upload Map Image'}
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const formData = new FormData();
                            formData.append('file', file);
                            const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default';
                            const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
                            formData.append('upload_preset', uploadPreset);
                            try {
                              const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
                              const data = await res.json();
                              if (data.secure_url) setEditFloorData({ ...editFloorData, image: data.secure_url });
                            } catch (err) { console.error(err); }
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className="pt-3 pb-2 border-t border-gray-100 dark:border-gray-800 dark:border-gray-800">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 dark:text-gray-300">Floor Facilities</span>
                    <button onClick={() => {
                      setEditFloorData(prev => ({
                        ...prev,
                        floorFacilitiesList: [...(prev.floorFacilitiesList || []), { images: [], description: '' }]
                      }));
                    }} className="text-xs text-blue-600 font-medium flex items-center gap-1 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded">
                      <Plus className="w-3.5 h-3.5" /> Add Facility
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {editFloorData.floorFacilitiesList.map((facility, fIdx) => (
                      <div key={fIdx} className="flex flex-col gap-2 bg-gray-50 dark:bg-gray-950 dark:bg-gray-950 p-3 border border-gray-200 dark:border-gray-800 dark:border-gray-800 rounded-lg">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 dark:text-gray-400">Facility {fIdx + 1}</span>
                          <button onClick={() => {
                            const newList = editFloorData.floorFacilitiesList.filter((_, i) => i !== fIdx);
                            setEditFloorData({...editFloorData, floorFacilitiesList: newList});
                          }} className="text-red-400 hover:text-red-600 p-1 shrink-0">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        
                        <textarea 
                          className="w-full border border-gray-200 dark:border-gray-800 dark:border-gray-800 bg-white dark:bg-gray-900 dark:bg-gray-900 p-2 text-xs text-gray-700 dark:text-gray-300 dark:text-gray-300 focus:ring-1 focus:ring-blue-300 outline-none rounded resize-none mb-1" 
                          rows={2}
                          value={facility.description} 
                          placeholder="Add description for this facility group (e.g. Washroom)..."
                          onChange={(e) => {
                            setEditFloorData(prev => {
                              const newList = [...prev.floorFacilitiesList];
                              newList[fIdx] = { ...newList[fIdx], description: e.target.value };
                              return { ...prev, floorFacilitiesList: newList };
                            });
                          }} 
                        />
                        
                        {facility.images.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {facility.images.map((img, imgIdx) => (
                              <div key={imgIdx} className="relative group">
                                <img src={img} alt="facility" onClick={() => setPreviewImage(img)} className="h-12 w-20 object-cover rounded border border-gray-200 dark:border-gray-800 dark:border-gray-800 cursor-pointer hover:opacity-80 transition-opacity" />
                                <button onClick={() => {
                                  setEditFloorData(prev => {
                                    const newList = [...prev.floorFacilitiesList];
                                    newList[fIdx] = { ...newList[fIdx], images: newList[fIdx].images.filter((_, i) => i !== imgIdx) };
                                    return { ...prev, floorFacilitiesList: newList };
                                  });
                                }} className="absolute -top-1.5 -right-1.5 bg-white dark:bg-gray-900 dark:bg-gray-900 rounded-full text-red-500 shadow hover:text-red-700 p-0.5 hidden group-hover:block">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex items-center">
                          <input 
                            type="file" 
                            accept="image/*"
                            id={`floor-facility-upload-${fIdx}`}
                            className="hidden"
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    const formData = new FormData();
                                    formData.append('file', file);
                                    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default';
                                    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
                                    formData.append('upload_preset', uploadPreset);
                                    
                                    try {
                                        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
                                        const data = await res.json();
                                        if (data.secure_url) {
                                            setEditFloorData(prev => {
                                                const newList = [...prev.floorFacilitiesList];
                                                newList[fIdx] = { ...newList[fIdx], images: [...(newList[fIdx].images || []), data.secure_url] };
                                                return { ...prev, floorFacilitiesList: newList };
                                            });
                                        }
                                    } catch (err) { console.error(err); }
                                }
                            }}
                          />
                          <label 
                            htmlFor={`floor-facility-upload-${fIdx}`}
                            className="text-xs text-blue-600 font-semibold hover:text-blue-800 cursor-pointer flex items-center justify-center gap-1.5 border border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 w-full py-1.5 rounded-lg transition-colors"
                          >
                            <Upload className="w-3.5 h-3.5" /> Add Image to this Facility
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
            <div className="p-5 sm:p-6 border-t border-gray-100 dark:border-gray-800 dark:border-gray-800 flex justify-end gap-3 bg-gray-50 dark:bg-gray-950 dark:bg-gray-950 rounded-b-xl">
              <button onClick={() => setIsEditFloorModalOpen(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-200 dark:border-gray-800 dark:border-gray-800 bg-white dark:bg-gray-900 dark:bg-gray-900">
                Cancel
              </button>
              <button 
                onClick={() => {
                  const updatedProperties = properties.map(p => {
                    if (p.id === selectedPropertyId) {
                      const newRoomsPerFloor = [...(p.roomsPerFloor || [])];
                      newRoomsPerFloor[editFloorData.floor - 1] = editFloorData.rooms;
                      
                      const newBedsPerFloor = [...(p.bedsPerFloor || [])];
                      newBedsPerFloor[editFloorData.floor - 1] = editFloorData.beds;
                      
                      const newFloorNames = [...(p.floorNames || Array(p.floors).fill(''))];
                      newFloorNames[editFloorData.floor - 1] = editFloorData.name;
                      
                      const newFloorImages = [...(p.floorImages || Array(p.floors).fill(''))];
                      newFloorImages[editFloorData.floor - 1] = editFloorData.image;
                      
                      const newFloorFacilitiesLists = p.floorFacilitiesLists ? [...p.floorFacilitiesLists] : Array.from({ length: p.floors }, () => []);
                      newFloorFacilitiesLists[editFloorData.floor - 1] = editFloorData.floorFacilitiesList;
                      
                      const totalRooms = newRoomsPerFloor.reduce((a, b) => a + (b || 0), 0);
                      
                      return {
                        ...p,
                        roomsPerFloor: newRoomsPerFloor,
                        bedsPerFloor: newBedsPerFloor,
                        floorNames: newFloorNames,
                        floorImages: newFloorImages,
                        floorFacilitiesLists: newFloorFacilitiesLists,
                        rooms: totalRooms,
                        isCustomBedsPerFloor: true 
                      };
                    }
                    return p;
                  });
                  setProperties(updatedProperties);
                  localStorage.setItem('hms_properties', JSON.stringify(updatedProperties));
                  setIsEditFloorModalOpen(false);
                  setSuccessMessage(`Floor ${editFloorData.floor} details updated successfully!`);
                }}
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreviewImage(null)} className="absolute -top-10 right-0 md:-right-10 text-white hover:text-gray-300 p-2 transition-colors">
              <X className="w-8 h-8" />
            </button>
            <img src={previewImage} alt="Preview" className="w-auto h-auto max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
          </div>
        </div>
      )}

    </div>
  );
}
