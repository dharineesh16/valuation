# Copyright (c) 2025, dharineesh and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import flt


class Valuation(Document):

    def before_save(self):
        """Run all backend calculations safely"""
        self.sync_base_fields()
        self.calculate_areas()
        self.calculate_guideline_market()
        self.calculate_approved_actual()
        self.amenities_calculations()
        self.summary_of_calculations()

    # -------------------------------------------------
    # FIELD SYNC
    # -------------------------------------------------

    def sync_base_fields(self):
        self.jn = flt(self.yt)
        self.vidu_r = flt(self.priya_p)
        self.fr = flt(self.cf_c)
        self.youth_y = flt(self.promo_p)

    # -------------------------------------------------
    # AREA CALCULATIONS
    # -------------------------------------------------

    def calculate_areas(self):
        yt = flt(self.yt)
        priya_p = flt(self.priya_p)
        cf_c = flt(self.cf_c)
        promo_p = flt(self.promo_p)

        # Plinth
        self.freedom = yt + priya_p

        # Carpet
        self.hg = yt * 0.9
        self.remo_r = priya_p * 0.9
        self.total_in_sft = self.hg + self.remo_r

        # CP
        self.dc = cf_c * 0.9
        self.board_er = promo_p * 0.9
        self.cp_total_in_sft = self.dc + self.board_er

        # Saleable
        self.to_total_in_sft = flt(self.jn) + flt(self.vidu_r)
        self.fortness = flt(self.fr) + flt(self.youth_y)
        self.sa_total_in_sft = self.fortness

    # -------------------------------------------------
    # GUIDELINE & MARKET
    # -------------------------------------------------

    def calculate_guideline_market(self):
        self.tron = flt(self.as_per_guideline_value) * flt(self.rate_for_sft)
        self.dr_d = flt(self.as_per_market_rate) * flt(self.mr_rate_for_sft)

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

        self.total_buliding_value_amentities = flt(self.ravi) + self.amentities
        self.jk_total_buliding_amentities = flt(self.ipl_i) + self.jkl_j

        self.total_guide_line = flt(self.tron) + self.total_buliding_value_amentities
        self.iopl_total_guide_line = flt(self.tron) + self.jk_total_buliding_amentities

        self.total_fair_market_value = flt(self.dr_d) + self.total_buliding_value_amentities
        self.khj_total_fair_market = flt(self.dr_d) + self.jk_total_buliding_amentities

        self.realizable_value = self.total_fair_market_value * 0.9
        self.piol_realizable_value = self.khj_total_fair_market * 0.9

        self.forced_distressed_value = self.total_fair_market_value * 0.8
        self.yuo_forced_distressed_value = self.khj_total_fair_market * 0.8

    # -------------------------------------------------
    # SUMMARY (FIELD ASSIGNMENTS ONLY)
    # -------------------------------------------------

    def summary_of_calculations(self):
        """
        Store final summary values into DocFields
        (Do NOT return dict – Frappe ignores it)
        """
        self.glr_value = flt(self.total_guide_line)
        self.as_glr_value = flt(self.iopl_total_guide_line)

        self.iuyt_market_value = flt(self.total_fair_market_value)
        self.per_fair_market = flt(self.khj_total_fair_market)

        self.uyt_realisable_value = flt(self.realizable_value)
        self.act_realisable_value = flt(self.piol_realizable_value)

        self.iutyre_distress_sale_value = flt(self.forced_distressed_value)
        self.ip_distress_sale_value = flt(self.yuo_forced_distressed_value)
        self.ravi = self.net_cost_after_depreciation
        self.ipl_i = self.net_cost_after_depreciation_1
