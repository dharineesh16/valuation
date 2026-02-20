# Copyright (c) 2025, dharineesh and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import flt


class Valuation(Document):

    def before_save(self):
        """Run all backend calculations safely"""
        self.auto_calculate_floor_areas()
        self.calculate_floor_totals()
        self.calculate_floor_totals_approved()
        # Update floor_area_calculation WITHOUT regenerating rows
        self.update_floor_area_calculation()
        self.calculate_guideline_market()
        self.calculate_approved_actual()
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

        self.vp_as_per_actual = total_plinth
        self.as_per_actual_2 = total_carpet

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

        self.ae_per_approved_plan = total_plinth_approved
        self.rp_as_per_approved_plan = total_carpet_approved

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

    def calculate_approved_actual(self):
        self.hit = flt(self.ae_per_approved_plan) * flt(self.rate_2)
        self.float_htmj = flt(self.rp_as_per_approved_plan) * flt(self.iu_i)

        self.jack = flt(self.vp_as_per_actual) * flt(self.rate_2)
        self.ip_i = flt(self.as_per_actual_2) * flt(self.iu_i)

        self.ravi = self.hit + self.float_htmj
        self.ipl_i = self.jack + self.ip_i

    # -------------------------------------------------
    # AMENITIES
    # -------------------------------------------------

    def amenities_calculations(self):
        self.amentities = (
            flt(self.water_sump)
            + flt(self.septic_tank)
            + flt(self.bore)
            + flt(self.head_room)
        )

        self.jkl_j = (
            flt(self.lo_l)
            + flt(self.ty_t)
            + flt(self.tl_t)
            + flt(self.mn_m)
        )

        floor_area_total_approved = 0
        floor_area_total_actual = 0
        
        if hasattr(self, 'floor_area_calculation') and self.floor_area_calculation:
            for row in self.floor_area_calculation:
                if str(row.floor_type or '').strip().lower() == 'total':
                    floor_area_total_approved = flt(row.total_as_per_approved_plan)
                    floor_area_total_actual = flt(row.total_as_per_actual)
                    break

        self.total_buliding_value_amentities = self.amentities + floor_area_total_approved
        self.jk_total_buliding_amentities = self.jkl_j + floor_area_total_actual

        self.total_guide_line = flt(self.tron) + self.total_buliding_value_amentities
        self.iopl_total_guide_line = flt(self.tron) + self.jk_total_buliding_amentities

        self.total_fair_market_value = flt(self.dr_d) + self.total_buliding_value_amentities
        self.khj_total_fair_market = flt(self.dr_d) + self.jk_total_buliding_amentities

        self.realizable_value = self.total_fair_market_value * 0.9
        self.piol_realizable_value = self.khj_total_fair_market * 0.9

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

    # -------------------------------------------------
    # SUMMARY (FIELD ASSIGNMENTS ONLY)
    # -------------------------------------------------

    def summary_of_calculations(self):
        """
        Store final summary values into DocFields
        (Do NOT return dict - Frappe ignores it)
        """
        self.uoyt_glr_value = str(flt(self.total_guide_line))
        self.glr_value = str(flt(self.iopl_total_guide_line))

        self.iuyt_market_value = str(flt(self.total_fair_market_value))
        self.fair_market = str(flt(self.khj_total_fair_market))

        self.uyt_realisable_value = str(flt(self.realizable_value))
        self.realisable_value = str(flt(self.piol_realizable_value))

        self.iutyre_distress_sale_value = str(flt(self.forced_distressed_value))
        self.ip_distress_sale_value = str(flt(self.yuo_forced_distressed_value))
        
        floor_area_total_approved = 0
        floor_area_total_actual = 0
        
        if hasattr(self, 'floor_area_calculation') and self.floor_area_calculation:
            for row in self.floor_area_calculation:
                if str(row.floor_type or '').strip().lower() == 'total':
                    floor_area_total_approved = flt(row.total_as_per_approved_plan)
                    floor_area_total_actual = flt(row.total_as_per_actual)
                    break
        
        self.net_cost_after_depreciation = flt(floor_area_total_approved)
        self.net_cost_after_depreciation_1 = flt(floor_area_total_actual)