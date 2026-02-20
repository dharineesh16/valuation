from . import __version__ as app_version

app_name = "valuation_app"
app_title = "Valuation App"
app_publisher = "Civil Tec Hosur"
app_description = "Property Valuation Application"
app_icon = "octicon octicon-file-directory"
app_color = "blue"
app_email = "valuation.civiltec@gmail.com"
app_license = "MIT"

# Includes in <head>
# ------------------

app_include_css = "/assets/valuation_app/css/valuation.css"
app_include_js = "/assets/valuation_app/js/valuation.js"

# Fixtures
# --------
fixtures = [
    "Print Format"
]

def after_install(app):
    """Create default print format after app installation"""
    create_valuation_print_format()

def create_valuation_print_format():
    """Create the Valuation Print Format and set it as default"""
    import frappe
    import os
    
    # Check if print format already exists
    if frappe.db.exists("Print Format", "Valuation Print Format"):
        # Update existing print format with HTML content
        print_format = frappe.get_doc("Print Format", "Valuation Print Format")
    else:
        # Create new print format
        print_format = frappe.get_doc({
            "doctype": "Print Format",
            "name": "Valuation Print Format",
            "doc_type": "Valuation",
            "format": "Valuation Print Format",
            "print_format_type": "Jinja",
            "raw_print_format": 0,
            "disabled": 0,
            "is_default": 1,
            "custom_format": 1
        })
    
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
    
    print_format.html = html
    
    try:
        if print_format.is_new():
            print_format.insert(ignore_permissions=True)
        else:
            print_format.save(ignore_permissions=True)
        
        # Set as default print format for Valuation doctype
        frappe.db.set_value(
            "DocType", 
            "Valuation", 
            "default_print_format", 
            "Valuation Print Format"
        )
        
        frappe.db.commit()
    except Exception as e:
        frappe.log_error(f"Error creating print format: {e}")