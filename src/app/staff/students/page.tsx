'use client';

import { useState, useEffect } from 'react';
import { Users, X, Search, Plus, Mail, Phone, Home, Calendar, MapPin, GraduationCap, HeartPulse, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { floorLabel, parseRoomString } from '@/lib/propertyTypes';
import { StudentAvatar } from '@/components/StudentAvatar';
import { staffPhotoUrl } from '@/lib/photoClient';
import { STAY_LABEL, studentStatus, studentStay, type Stay, type StayBooking } from '@/lib/studentStay';
import { adminCard, adminPage } from '@/components/staff/adminStyles';

export default function AdminStudents() {
  const [students, setStudents] = useState<any[]>([]);
  // Bookings and units, to show where each student stays (assigned bed or booking)
  const [bookings, setBookings] = useState<StayBooking[]>([]);
  const [overrides, setOverrides] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [studentToDelete, setStudentToDelete] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [floorFilter, setFloorFilter] = useState('all');

    useEffect(() => {
    fetch('/api/v1-students?limit=1000').then(res => res.json()).then(data => {
      if (data && data.docs) setStudents(data.docs);
    }).catch(e => console.error(e));

    fetch('/api/v1-properties?limit=1000').then(res => res.json()).then(data => {
      if (data && data.docs) setProperties(data.docs);
    }).catch(e => console.error(e));

    fetch('/api/v1-bot-bookings?where[type][equals]=bed_hold&limit=2000&depth=0').then(res => res.json()).then(data => {
      if (data && data.docs) setBookings(data.docs);
    }).catch(e => console.error(e));

    fetch('/api/v1-room-overrides?limit=2000&depth=0').then(res => res.json()).then(data => {
      if (data && data.docs) setOverrides(Object.fromEntries(data.docs.map((o: any) => [o.overrideKey, o])));
    }).catch(e => console.error(e));
  }, []);

  const stays = new Map<string, Stay | null>(students.map((s) => [String(s.id), studentStay(s, bookings, properties, overrides)]));

  const handleDeleteStudent = (id: any) => {
    setStudentToDelete(id);
  };

    const confirmDeleteStudent = async () => {
    if (studentToDelete !== null) {
      try {
        await fetch(`/api/v1-students/${studentToDelete}`, { method: 'DELETE' });
        const updatedStudents = students.filter(s => s.id !== studentToDelete);
        setStudents(updatedStudents);
        setStudentToDelete(null);
      } catch (e) { console.error(e); }
    }
  };

  const filteredStudents = students.filter(s => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      (s.name && s.name.toLowerCase().includes(query)) ||
      (s.email && s.email.toLowerCase().includes(query)) ||
      (s.room && s.room.toLowerCase().includes(query)) ||
      (s.property && s.property.toLowerCase().includes(query)) ||
      [stays.get(String(s.id))?.hostel, stays.get(String(s.id))?.unit, stays.get(String(s.id))?.booking?.ref].some((v) => v && v.toLowerCase().includes(query)) ||
      (s.phone && s.phone.toLowerCase().includes(query))
    );

    let matchesProperty = true;
    if (propertyFilter !== 'all') {
      matchesProperty = s.property === propertyFilter || stays.get(String(s.id))?.hostel === propertyFilter;
    }

    let matchesFloor = true;
    if (floorFilter !== 'all' && s.room) {
      matchesFloor = parseRoomString(s.room)?.floor === floorFilter;
    }

    return matchesSearch && matchesProperty && matchesFloor;
  });


  return (
    <div className={adminPage}>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Students</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage student directory and profiles.</p>
        </div>
        <Link 
          href="/staff/students/add"
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 sm:w-auto"
        >
          <Plus className="h-4 w-4" /> Add Student
        </Link>
      </div>

      <div className={`${adminCard} flex min-h-[420px] flex-col sm:min-h-[600px]`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between bg-gray-50 dark:bg-gray-950 gap-3">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Student Directory</h3>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <select
              value={propertyFilter}
              onChange={(e) => {
                setPropertyFilter(e.target.value);
                setFloorFilter('all');
              }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 outline-none bg-white dark:bg-gray-900"
            >
              <option value="all">All Properties</option>
              {properties.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
            
            {propertyFilter !== 'all' && (
              <select
                value={floorFilter}
                onChange={(e) => setFloorFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 outline-none bg-white dark:bg-gray-900"
              >
                <option value="all">All Floors</option>
                {Array.from({ length: properties.find(p => p.name === propertyFilter)?.floors || 1 }).map((_, i) => (
                  <option key={i} value={String(i + 1)}>{floorLabel(properties.find(p => p.name === propertyFilter), i + 1)}</option>
                ))}
                <option value="S">Outside floors</option>
              </select>
            )}

            <div className="relative w-full sm:w-64">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search students..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 outline-none" 
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th scope="col" className="px-6 py-4 font-semibold">Name</th>
                <th scope="col" className="px-6 py-4 font-semibold">Contact</th>
                <th scope="col" className="px-6 py-4 font-semibold">Room</th>
                <th scope="col" className="px-6 py-4 font-semibold">Status</th>
                <th scope="col" className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="bg-white dark:bg-gray-900 border-b hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-950 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <StudentAvatar name={student.name} src={staffPhotoUrl(student)} size={40} />
                        <div className="font-medium text-gray-900 dark:text-gray-100">{student.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-xs">
                        <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-gray-400" /> {student.email}</span>
                        <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-gray-400" /> {student.phone || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const stay = stays.get(String(student.id));
                        if (!stay) {
                          return (
                            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                              <Home className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">No room yet</span>
                            </div>
                          );
                        }
                        return (
                          <div className="flex flex-col gap-1 text-xs">
                            <div className="flex items-center gap-1.5 text-gray-900 dark:text-gray-100">
                              <MapPin className="h-3.5 w-3.5 text-gray-400" />
                              <span className="font-medium text-sm">{stay.hostel}</span>
                              <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${stay.source === 'held' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>{STAY_LABEL[stay.source]}</span>
                            </div>
                            <div className="pl-5 text-gray-700 dark:text-gray-300">{stay.unitType}: {stay.unit}{stay.floor ? ` · ${stay.floor}` : ''}</div>
                            <div className="pl-5 text-gray-500 dark:text-gray-400">{stay.bed}{stay.bedType ? ` (${stay.bedType})` : ''}{stay.booking ? ` · ${stay.booking.ref}` : ''}</div>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const status = studentStatus(student, stays.get(String(student.id)) ?? null);
                        const tone = status === 'Active' ? 'bg-green-100 text-green-800 border-green-200' : status === 'On hold' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-gray-100 text-gray-700 border-gray-200';
                        return <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${tone}`}>{status}</span>;
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-3">
                        <Link 
                          href={`/staff/students/${student.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
                        >
                          View
                        </Link>
                        <button 
                          onClick={() => handleDeleteStudent(student.id)}
                          className="text-red-600 hover:text-red-800 font-medium text-sm transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500 dark:text-gray-400 mb-2">No students found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      {studentToDelete !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Delete Student</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Are you sure you want to delete <span className="font-semibold text-gray-700 dark:text-gray-300">{students.find(s => s.id === studentToDelete)?.name}</span>? This action cannot be undone and will remove all their records.
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 flex gap-3 justify-end">
              <button 
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-950 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteStudent}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 transition-colors"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
