import os
import re

def fix_staff_page():
    path = "/home/midhun/works/hms/src/app/staff/page.tsx"
    with open(path, "r") as f:
        content = f.read()

    init_pattern = re.compile(r"useEffect\(\(\) => \{.*?const savedProperties = localStorage\.getItem\('hms_properties'\);.*?const savedPayments = localStorage\.getItem\('hms_payments'\);.*?\} catch \(e\) \{\}\n    \}\n  \}, \[\]\);", re.DOTALL)
    new_init = r"""  useEffect(() => {
    fetch('/api/v1-properties?limit=1000').then(res => res.json()).then(data => {
      if (data && data.docs) setProperties(data.docs);
    });
    fetch('/api/v1-students?limit=1000').then(res => res.json()).then(data => {
      if (data && data.docs) setStudents(data.docs);
    });
    fetch('/api/v1-room-overrides?limit=1000').then(res => res.json()).then(data => {
      if (data && data.docs) {
        const overrides: any = {};
        data.docs.forEach((doc: any) => overrides[doc.overrideKey] = doc);
        setRoomOverrides(overrides);
      }
    });
    const savedPayments = localStorage.getItem('hms_payments');
    if (savedPayments) {
      try {
        setPayments(JSON.parse(savedPayments));
      } catch (e) {}
    }
  }, []);"""
    content = init_pattern.sub(lambda m: new_init, content)
    with open(path, "w") as f:
        f.write(content)

def fix_student_details_page():
    path = "/home/midhun/works/hms/src/app/staff/students/[id]/page.tsx"
    with open(path, "r") as f:
        content = f.read()
        
    init_pattern = re.compile(r"useEffect\(\(\) => \{.*?const saved = localStorage\.getItem\('hms_students'\);.*?const savedProps = localStorage\.getItem\('hms_properties'\);.*?const savedOverrides = localStorage\.getItem\('hms_room_overrides'\);.*?\n  \}, \[params\.id, router\]\);", re.DOTALL)
    new_init = r"""  useEffect(() => {
    fetch(`/api/v1-students/${params.id}`).then(res => res.json()).then(data => {
      if (data && !data.error) setStudent(data);
      else router.push('/staff/students');
    }).catch(() => router.push('/staff/students'));

    fetch('/api/v1-properties?limit=1000').then(res => res.json()).then(data => {
      if (data && data.docs) setProperties(data.docs);
    });

    fetch('/api/v1-room-overrides?limit=1000').then(res => res.json()).then(data => {
      if (data && data.docs) {
        const overrides: any = {};
        data.docs.forEach((doc: any) => overrides[doc.overrideKey] = doc);
        setRoomOverrides(overrides);
      }
    });
  }, [params.id, router]);"""
    content = init_pattern.sub(lambda m: new_init, content)
    
    del_pattern = re.compile(r"const handleDelete = \(\) => \{.*?localStorage\.setItem\('hms_students', JSON\.stringify\(updatedStudents\)\);.*?\}", re.DOTALL)
    new_del = r"""const handleDelete = async () => {
    if (student) {
      await fetch(`/api/v1-students/${student.id}`, { method: 'DELETE' });
      router.push('/staff/students');
    }
  }"""
    content = del_pattern.sub(lambda m: new_del, content)
    
    with open(path, "w") as f:
        f.write(content)

def fix_payments_page():
    path = "/home/midhun/works/hms/src/app/staff/payments/page.tsx"
    with open(path, "r") as f:
        content = f.read()

    init_pattern = re.compile(r"useEffect\(\(\) => \{.*?const saved = localStorage\.getItem\('hms_payments'\);.*?const savedStudents = localStorage\.getItem\('hms_students'\);.*?const savedProps = localStorage\.getItem\('hms_properties'\);.*?const savedOverrides = localStorage\.getItem\('hms_room_overrides'\);.*?\n  \}, \[\]\);", re.DOTALL)
    new_init = r"""  useEffect(() => {
    const saved = localStorage.getItem('hms_payments');
    if (saved) {
      try {
        setPayments(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse payments");
      }
    }
    
    fetch('/api/v1-students?limit=1000').then(res => res.json()).then(data => {
      if (data && data.docs) setAvailableStudents(data.docs);
    });

    fetch('/api/v1-properties?limit=1000').then(res => res.json()).then(data => {
      if (data && data.docs) setProperties(data.docs);
    });

    fetch('/api/v1-room-overrides?limit=1000').then(res => res.json()).then(data => {
      if (data && data.docs) {
        const overrides: any = {};
        data.docs.forEach((doc: any) => overrides[doc.overrideKey] = doc);
        setRoomOverrides(overrides);
      }
    });
  }, []);"""
    content = init_pattern.sub(lambda m: new_init, content)
    
    with open(path, "w") as f:
        f.write(content)

fix_staff_page()
fix_student_details_page()
fix_payments_page()
