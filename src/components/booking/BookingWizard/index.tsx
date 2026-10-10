'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { BedSelector, RoomData } from '../BedSelector';
import { DocumentUploader } from '../DocumentUploader';
import { PaymentSummary } from '../PaymentSummary';
import { propertiesApi, Property } from '@/lib/api/properties';
import { availabilityApi } from '@/lib/api/availability';
import { bookingsApi } from '@/lib/api/bookings';
import styles from './BookingWizard.module.css';

const STEPS = ['Search', 'Select Bed', 'Your Details', 'Documents', 'Confirm'];

export const BookingWizard = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedProperty = searchParams?.get('property');
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

  // Data State
  const [properties, setProperties] = useState<Property[]>([]);
  const [availableRooms, setAvailableRooms] = useState<RoomData[]>([]);

  // Form State
  const [selectedProperty, setSelectedProperty] = useState(preselectedProperty || '');
  const [selectedDuration, setSelectedDuration] = useState('51');
  const [checkInDate, setCheckInDate] = useState('');
  const [selectedBed, setSelectedBed] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    nationality: '',
    passport: '',
    university: ''
  });

  useEffect(() => {
    propertiesApi.getProperties().then(res => {
      setProperties(res.docs);
      if (preselectedProperty && !selectedProperty) {
        setSelectedProperty(preselectedProperty);
      } else if (res.docs.length > 0 && !selectedProperty) {
        setSelectedProperty(res.docs[0].id);
      }
    });
  }, [preselectedProperty]);

  const loadAvailability = async () => {
    setIsLoadingAvailability(true);
    try {
      const res = await availabilityApi.checkAvailability(selectedProperty);
      setAvailableRooms(res.rooms);
    } catch (error) {
      console.error('Failed to load availability:', error);
      setAvailableRooms([]);
    } finally {
      setIsLoadingAvailability(false);
    }
  };

  const handleNext = async () => {
    if (currentStep === 0) {
      await loadAvailability();
    }
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(s => s + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(s => s - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Find the selected bed to get its room (the API requires properties, but let's just send what we have)
      // Assuming backend Bookings collection takes property, bed, dates, personal_info.
      const payload = {
        property: selectedProperty,
        bed: selectedBed!,
        check_in_date: checkInDate || new Date().toISOString(),
        check_out_date: new Date(Date.now() + 31536000000).toISOString(), // Mocking 1 year out
        status: 'PENDING_PAYMENT_VERIFICATION',
        payment_method: 'CASH',
        personal_info: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone
        }
      };
      
      const res = await bookingsApi.createBooking(payload);
      const bookingId = res.doc.id || res.doc._id || 'BK-PENDING';
      
      router.push(`/booking/${bookingId}`);
    } catch (error) {
      console.error('Booking submission failed:', error);
      alert('There was an error submitting your booking. The bed may no longer be available. Please try again.');
      // Return to bed selection
      setCurrentStep(1);
      await loadAvailability();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0: return true; // Search is mock valid
      case 1: return selectedBed !== null;
      case 2: return formData.firstName && formData.lastName && formData.email && formData.phone;
      case 3: return true; // Optional docs for now
      case 4: return true;
      default: return false;
    }
  };

  return (
    <div className={styles.wizardContainer}>
      <div className={styles.header}>
        <div className={styles.stepper}>
          <div className={styles.stepperLine} />
          <div 
            className={styles.stepperProgress} 
            style={{ transform: `scaleX(${currentStep / (STEPS.length - 1)})` }} 
          />
          {STEPS.map((label, index) => (
            <div key={label} className={styles.stepIndicator}>
              <div className={`
                ${styles.stepCircle} 
                ${currentStep === index ? styles.active : ''} 
                ${currentStep > index ? styles.completed : ''}
              `}>
                {currentStep > index ? '✓' : index + 1}
              </div>
              <div className={`${styles.stepLabel} ${currentStep === index ? styles.active : ''}`}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.content}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {currentStep === 0 && (
              <div>
                <h2 className={styles.stepTitle}>Find Accommodation</h2>
                <p className={styles.stepSubtitle}>Select your preferred location and dates.</p>
                <div className={styles.formGrid}>
                  <Select 
                    id="property" 
                    label="Property" 
                    value={selectedProperty}
                    onChange={(e) => setSelectedProperty(e.target.value)}
                    options={properties.map(p => ({ label: p.name, value: p.id }))} 
                  />
                  <Select 
                    id="duration" 
                    label="Contract Length" 
                    value={selectedDuration}
                    onChange={(e) => setSelectedDuration(e.target.value)}
                    options={[
                      { label: 'Full Academic Year (51 weeks)', value: '51' },
                      { label: 'Standard Academic (44 weeks)', value: '44' },
                      { label: 'Semester (20 weeks)', value: '20' }
                    ]} 
                  />
                  <Input 
                    type="date" 
                    label="Check-in Date" 
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div>
                <h2 className={styles.stepTitle}>Select Your Bed</h2>
                <p className={styles.stepSubtitle}>Choose from the available beds at this property.</p>
                
                {isLoadingAvailability ? (
                  <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Loading real-time availability...
                  </div>
                ) : availableRooms.length > 0 ? (
                  <BedSelector 
                    rooms={availableRooms} 
                    selectedBedId={selectedBed} 
                    onSelectBed={setSelectedBed} 
                  />
                ) : (
                  <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                    <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.5rem' }}>No beds available</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>We're sorry, but there are no available beds matching your criteria. Please try another property or date.</p>
                  </div>
                )}
              </div>
            )}

            {currentStep === 2 && (
              <div>
                <h2 className={styles.stepTitle}>Your Details</h2>
                <p className={styles.stepSubtitle}>Please provide your personal information exactly as it appears on your ID.</p>
                <div className={styles.formGrid}>
                  <Input id="firstName" label="First Name" value={formData.firstName} onChange={handleInputChange} required />
                  <Input id="lastName" label="Last Name" value={formData.lastName} onChange={handleInputChange} required />
                  <Input id="email" type="email" label="Email Address" value={formData.email} onChange={handleInputChange} required />
                  <Input id="phone" type="tel" label="Phone / WhatsApp" value={formData.phone} onChange={handleInputChange} required />
                  <Input id="nationality" label="Nationality" value={formData.nationality} onChange={handleInputChange} />
                  <Input id="passport" label="Passport / ID Number" value={formData.passport} onChange={handleInputChange} />
                  <Input id="university" label="University" value={formData.university} onChange={handleInputChange} />
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div>
                <h2 className={styles.stepTitle}>Upload Documents</h2>
                <p className={styles.stepSubtitle}>Upload your ID and visa documents. You can also provide these later via the Student Portal.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  <DocumentUploader label="Passport or National ID" onFilesChange={() => {}} />
                  <DocumentUploader label="University Acceptance Letter" onFilesChange={() => {}} />
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div>
                <h2 className={styles.stepTitle}>Confirm Booking</h2>
                <p className={styles.stepSubtitle}>Review your payment summary and complete your reservation.</p>
                <PaymentSummary 
                  rentAmount={selectedBed === 'b3' ? 1100 : 650} 
                  depositAmount={selectedBed === 'b3' ? 1100 : 650} 
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className={styles.footer}>
        <Button 
          variant="outline" 
          onClick={handlePrev} 
          disabled={currentStep === 0 || isSubmitting}
        >
          Back
        </Button>
        
        {currentStep < STEPS.length - 1 ? (
          <Button 
            onClick={handleNext} 
            disabled={!isStepValid()}
          >
            Continue to Next Step
          </Button>
        ) : (
          <Button 
            onClick={handleSubmit} 
            disabled={!isStepValid() || isSubmitting}
          >
            {isSubmitting ? 'Processing...' : 'Confirm & Book'}
          </Button>
        )}
      </div>
    </div>
  );
};
