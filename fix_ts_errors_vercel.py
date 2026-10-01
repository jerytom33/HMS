import os
import re

def fix_ts_errors():
    # Fix properties page
    prop_path = "/home/midhun/works/hms/src/app/staff/properties/page.tsx"
    with open(prop_path, "r") as f:
        content = f.read()

    # 1. Add id? to roomOverrides type
    content = content.replace(
        "useState<Record<string, { status?: string",
        "useState<Record<string, { id?: any, status?: string"
    )

    # 2. Make overrideData any
    content = content.replace(
        "const overrideData = {",
        "const overrideData: any = {"
    )

    # 3. Fix promises type
    content = content.replace(
        "const promises = [];",
        "const promises: any[] = [];"
    )

    with open(prop_path, "w") as f:
        f.write(content)

    # Fix payments page
    pay_path = "/home/midhun/works/hms/src/app/staff/payments/page.tsx"
    with open(pay_path, "r") as f:
        content = f.read()

    # 1. Fix setAvailableStudents to setStudents
    content = content.replace(
        "setAvailableStudents(data.docs);",
        "setStudents(data.docs);"
    )

    with open(pay_path, "w") as f:
        f.write(content)

fix_ts_errors()
