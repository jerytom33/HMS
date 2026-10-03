'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, User, Phone, MapPin, GraduationCap, HeartPulse, Mail, Calendar, Home, Edit, Trash2 } from 'lucide-react';
import { roomNumber, floorLabel, roomLabel, bedDisplayLabel, standaloneRoomNums, parseRoomString } from '@/lib/propertyTypes';

export default function StudentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;
  const searchParams = useSearchParams();
  const from = searchParams.get('from');
  const room = searchParams.get('room');
  const backLink = from === 'properties' ? '/staff/properties' : '/staff/students';
  
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAssigningRoom, setIsAssigningRoom] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [roomOverrides, setRoomOverrides] = useState<Record<string, any>>({});
  
  const [selectedPropId, setSelectedPropId] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [selectedBed, setSelectedBed] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('hms_students');
    if (saved) {
      const students = JSON.parse(saved);
      // Try to find by ID first, if not found (e.g. mock ID 1), just take the first one or match by some logic
      let found = students.find((s: any) => s.id.toString() === studentId);
      if (!found && students.length > 0) {
          found = students[0]; // fallback for mock purposes
      }
      setStudent(found);
    }
    
    const savedProps = localStorage.getItem('hms_properties');
    if (savedProps) setProperties(JSON.parse(savedProps));
    
    const savedOverrides = localStorage.getItem('hms_room_overrides');
    if (savedOverrides) setRoomOverrides(JSON.parse(savedOverrides));
    
    setLoading(false);
  }, [studentId]);

  const handleAssignRoom = () => {
    if (!selectedPropId || !selectedFloor || !selectedRoom || !selectedBed) return;
    const saved = localStorage.getItem('hms_students');
    const prop = properties.find(p => p.id.toString() === selectedPropId);
    
    if (saved && prop) {
      const students = JSON.parse(saved);
      const roomStr = `Room ${selectedRoom} - Bed ${selectedBed}`;
      const propName = prop.name;

      const updatedStudents = students.map((s: any) => {
        if (s.id.toString() === student.id.toString()) {
          return { ...s, room: roomStr, property: propName, status: 'Active' };
        }
        return s;
      });
      localStorage.setItem('hms_students', JSON.stringify(updatedStudents));
      
      // Update hms_room_overrides so properties page reflects the assignment
      const overrideKey = `${selectedPropId}-${selectedRoom}`;
      const currentOverrides = { ...roomOverrides };
      const roomOverride = currentOverrides[overrideKey] || {};
      
      const bedIndex = typeof selectedBed === 'string' && selectedBed.match(/[A-Z]/i) 
          ? selectedBed.toUpperCase().charCodeAt(0) - 65 
          : parseInt(selectedBed) - 1;
      const bedsCount = roomOverride.beds || (prop.bedsPerFloor ? prop.bedsPerFloor[parseInt(selectedFloor) - 1] : prop.beds) || 2;
      
      const newBedStatuses = [...(roomOverride.bedStatuses || Array(bedsCount).fill(false))];
      const newBedOccupants = [...(roomOverride.bedOccupants || Array(bedsCount).fill(null))];
      
      newBedStatuses[bedIndex] = true;
      newBedOccupants[bedIndex] = student.name;
      
      const newFilled = newBedStatuses.filter(v => v).length;
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
        bedStatuses: newBedStatuses,
        bedOccupants: newBedOccupants,
        filledBeds: newFilled,
        freeBeds: newFree,
        status: newStatus
      };
      
      localStorage.setItem('hms_room_overrides', JSON.stringify(currentOverrides));
      setRoomOverrides(currentOverrides);

      setStudent({ ...student, room: roomStr, property: propName, status: 'Active' });
      setIsAssigningRoom(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading student details...</div>;
  
  if (!student) return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 text-center pt-20">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Student Not Found</h2>
      <p className="text-gray-500 dark:text-gray-400 mb-6">The student you are looking for does not exist.</p>
      <Link href="/staff/students" className="text-blue-600 hover:underline">Return to Students Directory</Link>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={backLink} className="p-2 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-800 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Student Profile</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Detailed view of student information.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <Link href={`/staff/students/add?edit=${student.id}`} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-950 transition-colors shadow-sm">
                <Edit className="w-4 h-4" /> Edit
            </Link>
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-sm">
                <Trash2 className="w-4 h-4" /> Delete
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="p-8 flex flex-col items-center border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/50">
              <div className="w-32 h-32 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-5xl mb-4 shadow-sm border-4 border-white">
                {student.name.charAt(0)}
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 text-center">{student.name}</h2>
              <span className="mt-2 bg-green-100 text-green-800 text-xs font-medium px-2.5 py-1 rounded-full border border-green-200">
                {student.status || 'Active'}
              </span>
            </div>
            <div className="p-4 bg-white dark:bg-gray-900 flex flex-col gap-3">
              <div className="flex justify-between text-sm py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500 dark:text-gray-400">Student ID</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">#{student.id}</span>
              </div>
              <div className="flex flex-col text-sm py-2 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-center w-full">
                    <span className="text-gray-500 dark:text-gray-400">Assigned Room</span>
                    {isAssigningRoom ? (
                      <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded">Assigning...</span>
                    ) : (
                      <span className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                        <Home className="w-3.5 h-3.5 text-blue-500" /> 
                        {student.room && student.room !== 'Unassigned' ? (
                          <div className="text-right">
                            <div>{student.room}</div>
                            {student.property && <div className="text-xs text-gray-500 dark:text-gray-400 font-normal">{student.property}</div>}
                          </div>
                        ) : (
                          <button onClick={() => setIsAssigningRoom(true)} className="text-blue-600 hover:underline text-xs bg-blue-50 px-2.5 py-0.5 rounded-full font-medium">Assign Now</button>
                        )}
                      </span>
                    )}
                  </div>
                  
                  {isAssigningRoom && (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-950 rounded border border-gray-200 dark:border-gray-800 flex flex-col gap-2">
                      <select 
                        value={selectedPropId} 
                        onChange={e => { setSelectedPropId(e.target.value); setSelectedFloor(''); setSelectedRoom(''); setSelectedBed(''); }} 
                        className="w-full border border-gray-300 dark:border-gray-700 rounded px-2 py-1.5 text-xs outline-none focus:border-blue-500 bg-white dark:bg-gray-900"
                      >
                        <option value="">Select Property</option>
                        {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      
                      {selectedPropId && (
                        <select 
                          value={selectedFloor} 
                          onChange={e => { setSelectedFloor(e.target.value); setSelectedRoom(''); setSelectedBed(''); }} 
                          className="w-full border border-gray-300 dark:border-gray-700 rounded px-2 py-1.5 text-xs outline-none focus:border-blue-500 bg-white dark:bg-gray-900"
                        >
                          <option value="">Select Floor</option>
                          {Array.from({ length: properties.find(p => p.id.toString() === selectedPropId)?.floors || 0 }).map((_, i) => (
                            <option key={i+1} value={i+1}>{floorLabel(properties.find(p => p.id.toString() === selectedPropId), i+1)}</option>
                          ))}
{selectedPropId && standaloneRoomNums(roomOverrides, selectedPropId).length > 0 && <option value="S">Outside floors</option>}
                        </select>
                      )}
                      
                      {selectedFloor && (
                        <select 
                          value={selectedRoom} 
                          onChange={e => { setSelectedRoom(e.target.value); setSelectedBed(''); }} 
                          className="w-full border border-gray-300 dark:border-gray-700 rounded px-2 py-1.5 text-xs outline-none focus:border-blue-500 bg-white dark:bg-gray-900"
                        >
                          <option value="">Select Room</option>
                          {Array.from({ length: properties.find(p => p.id.toString() === selectedPropId)?.roomsPerFloor?.[parseInt(selectedFloor) - 1] || 0 }).map((_, i) => {
                            const rNum = String(roomNumber(selectedFloor, i));
                            return <option key={rNum} value={rNum}>{roomLabel(properties.find(p => p.id.toString() === selectedPropId), rNum, roomOverrides[`${selectedPropId}-${rNum}`])}</option>
                          })}
{selectedFloor === 'S' && standaloneRoomNums(roomOverrides, selectedPropId).map(rNum => (
  <option key={rNum} value={rNum}>{roomLabel(properties.find(p => p.id.toString() === selectedPropId), rNum, roomOverrides[`${selectedPropId}-${rNum}`])}</option>
))}
                        </select>
                      )}
                      
                      {selectedRoom && (
                        <select 
                          value={selectedBed} 
                          onChange={e => setSelectedBed(e.target.value)} 
                          className="w-full border border-gray-300 dark:border-gray-700 rounded px-2 py-1.5 text-xs outline-none focus:border-blue-500 bg-white dark:bg-gray-900"
                        >
                          <option value="">Select Bed</option>
                          {(() => {
                            const prop = properties.find(p => p.id.toString() === selectedPropId);
                            const override = roomOverrides[`${selectedPropId}-${selectedRoom}`];
                            const beds = override?.beds || (prop?.bedsPerFloor ? prop.bedsPerFloor[parseInt(selectedFloor) - 1] : prop?.bedsPerRoom) || 0;
                            return Array.from({ length: beds }).map((_, i) => (
                              <option key={i+1} value={String.fromCharCode(65 + i)}>{bedDisplayLabel(override, i)}</option>
                            ));
                          })()}
                        </select>
                      )}
                      
                      <div className="flex gap-2 mt-2">
                        <button 
                          onClick={handleAssignRoom}
                          disabled={!selectedPropId || !selectedFloor || !selectedRoom || !selectedBed}
                          className="flex-1 bg-blue-600 text-white px-2 py-1.5 rounded text-xs font-medium hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
                        >
                          Save Assignment
                        </button>
                        <button 
                          onClick={() => setIsAssigningRoom(false)} 
                          className="flex-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1.5 rounded text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-950 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
              </div>
              <div className="flex justify-between text-sm py-2">
                  <span className="text-gray-500 dark:text-gray-400">Joined</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">Aug 2026</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Details */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Personal Details */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/50 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Personal Details</h3>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Full Name</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{student.name}</div>
              </div>
              <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1 flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Date of Birth</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{student.dateOfBirth || 'Not provided'}</div>
              </div>
              <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Gender</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100 capitalize">{student.gender || 'Not provided'}</div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/50 flex items-center gap-2">
              <Phone className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Contact Information</h3>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1 flex items-center gap-1.5"><Mail className="w-4 h-4" /> Email Address</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{student.email}</div>
              </div>
              <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1 flex items-center gap-1.5"><Phone className="w-4 h-4" /> Phone Number</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{student.phone || 'Not provided'}</div>
              </div>
              <div className="sm:col-span-2">
                  <div className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1 flex items-center gap-1.5"><MapPin className="w-4 h-4" /> Home Address</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{student.address || 'Not provided'}</div>
              </div>
            </div>
          </div>

          {/* Academic Information */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/50 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Academic Information</h3>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Course / Major</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{student.course || 'Not provided'}</div>
              </div>
              <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Year of Study</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{student.yearOfStudy ? `Year ${student.yearOfStudy}` : 'Not provided'}</div>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-red-200 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
            <div className="px-6 py-4 border-b border-red-100 bg-red-50/50 flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-red-600" />
              <h3 className="font-semibold text-red-900">Emergency Contact</h3>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 bg-red-50/30">
              <div>
                  <div className="text-sm text-red-400 font-medium mb-1">Contact Name & Relation</div>
                  <div className="font-bold text-red-900">{student.emergencyName || 'Not provided'} {student.emergencyRelation ? `(${student.emergencyRelation})` : ''}</div>
              </div>
              <div>
                  <div className="text-sm text-red-400 font-medium mb-1 flex items-center gap-1.5"><Phone className="w-4 h-4" /> Phone Number</div>
                  <div className="font-bold text-red-900">{student.emergencyPhone || 'Not provided'}</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
