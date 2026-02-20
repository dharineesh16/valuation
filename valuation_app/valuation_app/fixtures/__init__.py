# Fixtures for Valuation App
import frappe
import os

def get_print_format_data():
    """Return print format configuration"""
    return []

def after_install():
    """Create default print format after app installation"""
    create_valuation_print_format()

def create_valuation_print_format():
    """Create the Valuation Print Format"""
    
    # Check if print format already exists
    if frappe.db.exists("Print Format", "Valuation Print Format"):
        return
    
    # Read the HTML template
    template_path = frappe.get_app_path(
        "valuation_app", 
        "templates", 
        "print", 
        "valuation_print.html"
    )
    
    html = ""
    if os.path.exists(template_path):
        with open(template_path, "r") as f:
            html = f.read()
    
    # Create the print format
    print_format = frappe.get_doc({
        "doctype": "Print Format",
        "name": "Valuation Print Format",
        "doc_type": "Valuation",
        "format": "Valuation Print Format",
        "html": html,
        "css": None,
        "formatter": None,
        "print_format_type": "Jinja",
        "raw_print_format": 0,
        "disabled": 0,
        "is_default": 1,
        "custom_format": 1
    })
    
    print_format.insert(ignore_permissions=True)
    frappe.db.commit()
