# Copyright (c) 2025, dharineesh and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import flt
import json


@frappe.whitelist()
def calculate_deviations_js(scaleable_area, number_of_floors, number_of_floors_approved, floor_details, floor_details_approved):
    """
    Calculate deviations from client-side JavaScript
    This is called via frappe.call to ensure proper value propagation
    """
    import frappe
    frappe.flags.in_test = True  # Ensure logging works
    
    sa = flt(scaleable_area)
    nf = int(number_of_floors) if number_of_floors else 1
    nfa = int(number_of_floors_approved) if number_of_floors_approved else 1
    
    frappe.publish_realtime('msgprint', {'message': f'Deviation calc: sa={sa}, nf={nf}, nfa={nfa}'}, user='Administrator')
    
    # Parse floor_details
    actual_ground = 0
    if floor_details:
        if isinstance(floor_details, str):
            floor_details = json.loads(floor_details)
        for f in floor_details:
            if f.get('floor_type') and f.get('floor_type', '').strip().lower() == 'ground floor':
                actual_ground = flt(f.get('plinth_area'))
                break
    
    # Parse floor_details_approved
    approved_ground = 0
    if floor_details_approved:
        if isinstance(floor_details_approved, str):
            floor_details_approved = json.loads(floor_details_approved)
        for f in floor_details_approved:
            if f.get('floor_type') and f.get('floor_type', '').strip().lower() == 'ground floor':
                approved_ground = flt(f.get('plinth_area'))
                break
    
    frappe.publish_realtime('msgprint', {'message': f'Deviation calc: actual_ground={actual_ground}, approved_ground={approved_ground}'}, user='Administrator')
    
    # Calculate horizontal deviation
    if sa:
        actual_pct = (actual_ground / sa) * 100
        approved_pct = (approved_ground / sa) * 100
        horizontal_deviation = round(actual_pct - approved_pct, 0)
    else:
        horizontal_deviation = 0
    
    # Calculate vertical deviation
    vertical_deviation = round(((nf / nfa) * 100) - 100, 2)
    
    frappe.publish_realtime('msgprint', {'message': f'Deviation result: h={horizontal_deviation}, v={vertical_deviation}'}, user='Administrator')
    
    return {
        'horizontal_deviation': horizontal_deviation,
        'vertical_deviation': vertical_deviation
    }


class Valuation(Document):

    def before_save(self):
        """Run all backend calculations safely"""
        self.auto_calculate_floor_areas()
        self.calculate_floor_totals()
        self.calculate_floor_totals_approved()
        # Update floor_area_calculation WITHOUT regenerating rows
        self.update_floor_area_calculation()
        self.calculate_guideline_market()
        self.amenities_calculations()
        self.calculate_deviations()
        self.summary_of_calculations()

    # -------------------------------------------------
    # AUTO-CALCULATE CARPET AND SALEABLE AREAS IN FLOOR TABLES
    # -------------------------------------------------

    def auto_calculate_floor_areas(self):
        """Auto-calculate carpet and saleable areas based on plinth area"""
        
        # For floor_details (As Per Actual)
        if hasattr(self, 'floor_details') and self.floor_details:
            for floor in self.floor_details:
                floor_type = str(floor.floor_type or '').strip()
                if 'total' in floor_type.lower():
                    continue
                plinth = flt(floor.plinth_area)
                floor.carpet_area = plinth * 0.9
                floor.saleable_area = plinth

        # For floor_details_approved (As Per Approved Plan)
        if hasattr(self, 'floor_details_approved') and self.floor_details_approved:
            for floor in self.floor_details_approved:
                floor_type = str(floor.floor_type or '').strip()
                if 'total' in floor_type.lower():
                    continue
                plinth = flt(floor.plinth_area)
                floor.carpet_area = plinth * 0.9
                floor.saleable_area = plinth

    # -------------------------------------------------
    # FLOOR TOTALS CALCULATION (AS PER ACTUAL)
    # -------------------------------------------------

    def calculate_floor_totals(self):
        """Calculate totals from floor_details table"""
        total_plinth = 0
        total_carpet = 0
        total_saleable = 0
        total_row = None

        if hasattr(self, 'floor_details') and self.floor_details:
            for floor in self.floor_details:
                floor_type = str(floor.floor_type or '').strip()
                if 'total' in floor_type.lower():
                    total_row = floor
                    continue
                total_plinth += flt(floor.plinth_area)
                total_carpet += flt(floor.carpet_area)
                total_saleable += flt(floor.saleable_area)


        if total_row is not None:
            total_row.floor_type = 'Total in Sq.Ft'
            total_row.plinth_area = total_plinth
            total_row.carpet_area = total_carpet
            total_row.saleable_area = total_saleable

    # -------------------------------------------------
    # FLOOR TOTALS CALCULATION (AS PER APPROVED PLAN)
    # -------------------------------------------------

    def calculate_floor_totals_approved(self):
        """Calculate totals from floor_details_approved table"""
        total_plinth_approved = 0
        total_carpet_approved = 0
        total_saleable_approved = 0
        total_row = None

        if hasattr(self, 'floor_details_approved') and self.floor_details_approved:
            for floor in self.floor_details_approved:
                floor_type = str(floor.floor_type or '').strip()
                if 'total' in floor_type.lower():
                    total_row = floor
                    continue
                total_plinth_approved += flt(floor.plinth_area)
                total_carpet_approved += flt(floor.carpet_area)
                total_saleable_approved += flt(floor.saleable_area)


        if total_row is not None:
            total_row.floor_type = 'Total in Sq.Ft'
            total_row.plinth_area = total_plinth_approved
            total_row.carpet_area = total_carpet_approved
            total_row.saleable_area = total_saleable_approved

    # -------------------------------------------------
    # UPDATE FLOOR AREA CALCULATION (PRESERVE RATES!)
    # -------------------------------------------------

    def update_floor_area_calculation(self):
        """
        Update floor_area_calculation WITHOUT regenerating rows.
        Preserves the rate values entered by users.
        Only updates the plinth areas and recalculates totals.
        """
        if not hasattr(self, 'floor_area_calculation') or not self.floor_area_calculation:
            return
        
        actual_plinth_areas = {}
        if hasattr(self, 'floor_details') and self.floor_details:
            for floor in self.floor_details:
                floor_type = str(floor.floor_type or '').strip()
                if 'total' not in floor_type.lower():
                    actual_plinth_areas[floor_type] = flt(floor.plinth_area)
        
        approved_plinth_areas = {}
        if hasattr(self, 'floor_details_approved') and self.floor_details_approved:
            for floor in self.floor_details_approved:
                floor_type = str(floor.floor_type or '').strip()
                if 'total' not in floor_type.lower():
                    approved_plinth_areas[floor_type] = flt(floor.plinth_area)
        
        num_floors_approved = len(approved_plinth_areas)
        
        total_approved = 0
        total_actual = 0
        
        for row in self.floor_area_calculation:
            floor_type = str(row.floor_type or '').strip()
            if floor_type.lower() == 'total':
                continue
            row.as_per_approved_plan = approved_plinth_areas.get(floor_type, 0)
            row.as_per_actual = actual_plinth_areas.get(floor_type, 0)
            rate = flt(row.rate)
            row.total_as_per_approved_plan = flt(row.as_per_approved_plan) * rate
            row.total_as_per_actual = flt(row.as_per_actual) * rate
            total_approved += row.total_as_per_approved_plan
            total_actual += row.total_as_per_actual
        
        total_row = None
        for row in self.floor_area_calculation:
            if str(row.floor_type or '').strip().lower() == 'total':
                total_row = row
                break
        
        if total_row:
            total_row.as_per_approved_plan = 0
            total_row.as_per_actual = 0
            total_row.rate = num_floors_approved
            total_row.total_as_per_approved_plan = total_approved
            total_row.total_as_per_actual = total_actual

    # -------------------------------------------------
    # GUIDELINE & MARKET
    # -------------------------------------------------

    def calculate_guideline_market(self):
        self.tron = flt(self.as_per_guideline_value) * flt(self.rate_for_sft)
        self.dr_d = flt(self.as_per_market_rate) * flt(self.mr_rate_for_sft)
        self.realisable_value_for_market_land_rate = flt(self.dr_d) * 0.9
        self.forced_distressed_value_for_market_land_rate = flt(self.dr_d) * 0.8

    # -------------------------------------------------
    # APPROVED VS ACTUAL
    # -------------------------------------------------

    def amenities_calculations(self):
        # Get floor area totals from floor_area_calculation
        floor_area_total_approved = 0
        floor_area_total_actual = 0
        
        if hasattr(self, 'floor_area_calculation') and self.floor_area_calculation:
            for row in self.floor_area_calculation:
                if str(row.floor_type or '').strip().lower() == 'total':
                    floor_area_total_approved = flt(row.total_as_per_approved_plan)
                    floor_area_total_actual = flt(row.total_as_per_actual)
                    break

        # Store net_cost values
        self.net_cost_after_depreciation = floor_area_total_approved
        self.net_cost_after_depreciation_1 = floor_area_total_actual
        
        # Get amenities total from amenities table
        amenities_approved = 0
        amenities_actual = 0
        
        if hasattr(self, 'amenities') and self.amenities:
            for row in self.amenities:
                amenity_type = str(row.amenity_type or '').strip()
                if amenity_type in ['Water Sump', 'Septic Tank', 'Bore', 'Head Room']:
                    amenities_approved += flt(row.as_per_approved_plan)
                    amenities_actual += flt(row.as_per_actual)
        
        # Total Building Value + Amenities (As Per Approved Plan)
        total_building_amenities_approved = floor_area_total_approved + amenities_approved
        # Total Building Value + Amenities (As Per Actual)
        total_building_amenities_actual = floor_area_total_actual + amenities_actual
        
        # Total Guide Line Value = tron + total building value
        self.total_buliding_value_amentities = total_building_amenities_approved
        self.jk_total_buliding_amentities = total_building_amenities_actual
        
        self.total_guide_line = flt(self.tron) + total_building_amenities_approved
        self.iopl_total_guide_line = flt(self.tron) + total_building_amenities_actual
        
        # Total Fair Market Value = dr_d + total building value
        self.total_fair_market_value = flt(self.dr_d) + total_building_amenities_approved
        self.khj_total_fair_market = flt(self.dr_d) + total_building_amenities_actual
        
        # Realizable Value 90%
        self.realizable_value = self.total_fair_market_value * 0.9
        self.piol_realizable_value = self.khj_total_fair_market * 0.9
        
        # Forced Distressed Value 80%
        self.forced_distressed_value = self.total_fair_market_value * 0.8
        self.yuo_forced_distressed_value = self.khj_total_fair_market * 0.8

    # -------------------------------------------------
    # DEVIATIONS - GROUND FLOOR ONLY
    # -------------------------------------------------

    def calculate_deviations(self):
        """
        Horizontal Deviation % uses Ground Floor plinth area ONLY (not all floors total).
        Formula: =((E49/L45)*100%-((E54/L45)*100%))
        E49 = Ground Floor plinth area from floor_details       (As Per Actual)
        E54 = Ground Floor plinth area from floor_details_approved (As Per Approved Plan)
        L45 = scaleable_area (Saleable Area)

        Vertical Deviation % uses number of floors comparison.
        Formula: =((R39/R37*100%)-(R37/R37*100%))
        R39 = number_of_floors (As Per Actual)
        R37 = number_of_floors_approved (As Per Approved Plan)
        """
        scaleable_area = flt(self.scaleable_area)

        # Get Ground Floor plinth area from As Per Actual
        actual_ground = 0
        if hasattr(self, 'floor_details') and self.floor_details:
            for floor in self.floor_details:
                if str(floor.floor_type or '').strip().lower() == 'ground floor':
                    actual_ground = flt(floor.plinth_area)
                    break

        # Get Ground Floor plinth area from As Per Approved Plan
        approved_ground = 0
        if hasattr(self, 'floor_details_approved') and self.floor_details_approved:
            for floor in self.floor_details_approved:
                if str(floor.floor_type or '').strip().lower() == 'ground floor':
                    approved_ground = flt(floor.plinth_area)
                    break

        if scaleable_area:
            actual_pct   = (actual_ground   / scaleable_area) * 100
            approved_pct = (approved_ground / scaleable_area) * 100
            self.horizontal_deviation = round(actual_pct - approved_pct, 0)
        else:
            self.horizontal_deviation = 0

        # Vertical Deviation: =((R39/R37*100%)-(R37/R37*100%))
        # = (number_of_floors / number_of_floors_approved * 100) - 100
        # Select field default is '1', so fall back to 1 (not 0) when unset
        # Example: R39=5, R37=6 -> (5/6*100) - 100 = 83.33 - 100 = -16.67%
        number_of_floors          = int(self.number_of_floors)          if self.number_of_floors          else 1
        number_of_floors_approved = int(self.number_of_floors_approved) if self.number_of_floors_approved else 1

        self.vertical_deviation = round(
            ((number_of_floors / number_of_floors_approved) * 100) - 100, 2
        )

    # -------------------------------------------------
    # SUMMARY (FIELD ASSIGNMENTS ONLY)
    # -------------------------------------------------

    def summary_of_calculations(self):
        """
        Store final summary values into DocFields
        (Do NOT return dict - Frappe ignores it)
        """
        # Get floor area totals from floor_area_calculation
        floor_area_total_approved = 0
        floor_area_total_actual = 0
        
        if hasattr(self, 'floor_area_calculation') and self.floor_area_calculation:
            for row in self.floor_area_calculation:
                if str(row.floor_type or '').strip().lower() == 'total':
                    floor_area_total_approved = flt(row.total_as_per_approved_plan)
                    floor_area_total_actual = flt(row.total_as_per_actual)
                    break
        
        # Set net_cost values - these are the Building Value totals
        self.net_cost_after_depreciation = flt(floor_area_total_approved)
        self.net_cost_after_depreciation_1 = flt(floor_area_total_actual)
        
        # Summary values
        self.uoyt_glr_value = str(flt(self.total_guide_line))
        self.glr_value = str(flt(self.iopl_total_guide_line))

        self.iuyt_market_value = str(flt(self.total_fair_market_value))
        self.fair_market = str(flt(self.khj_total_fair_market))

        self.uyt_realisable_value = str(flt(self.realizable_value))
        self.realisable_value = str(flt(self.piol_realizable_value))

        self.iutyre_distress_sale_value = str(flt(self.forced_distressed_value))
        self.ip_distress_sale_value = str(flt(self.yuo_forced_distressed_value))
