"use client";

import { useState } from 'react';
import { Search, UserCheck, UserMinus, FileText, ArrowRight } from 'lucide-react';

export default function AdminBookings() {
  const [searchQuery, setSearchQuery] = useState('');
  
  const [arrivals, setArrivals] = useState([
    { id: 'BKG-1029', student: 'Sarah Williams', room: '105-A', property: 'Grand Residence', time: '14:00', status: 'Pending Arrival' },
    { id: 'BKG-1030', student: 'Michael Chang', room: '201-B', property: 'Grand Residence', time: '15:30', status: 'Checked In' },
  ]);

  const [departures, setDepartures] = useState([
    { id: 'BKG-0891', student: 'Emma Davis', room: '304-C', property: 'Riverside Halls', time: '10:00', status: 'Pending Inspection' },
  ]);

  const handleProcessCheckIn = (id: string) => {
    setArrivals(arrivals.map(arrival => 
      arrival.id === id ? { ...arrival, status: 'Checked In' } : arrival
    ));
  };

  const handleLogInspection = (id: string) => {
    setDepartures(departures.map(departure => 
      departure.id === id ? { ...departure, status: 'Inspection Logged' } : departure
    ));
  };

  const handleCompleteCheckout = (id: string) => {
    setDepartures(departures.map(departure => 
      departure.id === id ? { ...departure, status: 'Checked Out' } : departure
    ));
  };

  const filteredArrivals = arrivals.filter(arrival => 
    arrival.student.toLowerCase().includes(searchQuery.toLowerCase()) || 
    arrival.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    arrival.room.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDepartures = departures.filter(departure => 
    departure.student.toLowerCase().includes(searchQuery.toLowerCase()) || 
    departure.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    departure.room.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Check-in / Check-out</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage today's arrivals and departures.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search booking ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 outline-none w-full sm:w-64" 
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Arrivals Panel */}
        <div className="bg-white dark:bg-gray-900 shadow-sm rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-blue-600" /> Today's Arrivals
            </h2>
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-full">{filteredArrivals.length}</span>
          </div>
          <div className="divide-y divide-gray-200">
            {filteredArrivals.length > 0 ? filteredArrivals.map(arrival => (
              <div key={arrival.id} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{arrival.student}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{arrival.id}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${
                    arrival.status === 'Checked In' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {arrival.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Room</div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{arrival.room}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">ETA</div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{arrival.time}</div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button 
                    onClick={() => handleProcessCheckIn(arrival.id)}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50" 
                    disabled={arrival.status === 'Checked In'}>
                    {arrival.status === 'Checked In' ? 'Checked In' : 'Process Check-in'}
                  </button>
                  <button 
                    onClick={() => alert(`View details for ${arrival.id}`)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-950">
                    <FileText className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )) : (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">No arrivals found matching your search.</div>
            )}
          </div>
        </div>

        {/* Departures Panel */}
        <div className="bg-white dark:bg-gray-900 shadow-sm rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <UserMinus className="h-5 w-5 text-orange-600" /> Today's Departures
            </h2>
            <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-0.5 rounded-full">{filteredDepartures.length}</span>
          </div>
          <div className="divide-y divide-gray-200">
            {filteredDepartures.length > 0 ? filteredDepartures.map(departure => (
              <div key={departure.id} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{departure.student}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{departure.id}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${
                    departure.status === 'Checked Out' ? 'bg-green-100 text-green-800' : 
                    departure.status === 'Inspection Logged' ? 'bg-blue-100 text-blue-800' : 
                    'bg-orange-100 text-orange-800'
                  }`}>
                    {departure.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Room</div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{departure.room}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Time</div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{departure.time}</div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button 
                    onClick={() => handleLogInspection(departure.id)}
                    disabled={departure.status === 'Inspection Logged' || departure.status === 'Checked Out'}
                    className="flex-1 bg-white dark:bg-gray-900 border border-orange-600 text-orange-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-orange-50 disabled:opacity-50 disabled:border-gray-300 dark:border-gray-700 disabled:text-gray-500 dark:text-gray-400">
                    {departure.status === 'Inspection Logged' || departure.status === 'Checked Out' ? 'Inspection Logged' : 'Log Inspection'}
                  </button>
                  <button 
                    onClick={() => handleCompleteCheckout(departure.id)}
                    disabled={departure.status === 'Checked Out'}
                    className="flex-1 bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 flex justify-center items-center gap-2 disabled:opacity-50 disabled:hover:bg-gray-900">
                    {departure.status === 'Checked Out' ? 'Checked Out' : 'Complete Checkout'} {departure.status !== 'Checked Out' && <ArrowRight className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )) : (
               <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">No departures found matching your search.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
