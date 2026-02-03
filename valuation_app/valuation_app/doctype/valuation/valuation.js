// Copyright (c) 2025, dharineesh and contributors
// For license information, please see license.txt

frappe.ui.form.on('Valuation', {

    refresh(frm) {
        recalculate_all(frm);
    },

    // -----------------------------
    // BASE FIELD SYNC
    // -----------------------------
    yt: frm => sync_and_recalc(frm, 'jn', 'yt'),
    priya_p: frm => sync_and_recalc(frm, 'vidu_r', 'priya_p'),
    cf_c: frm => sync_and_recalc(frm, 'fr', 'cf_c'),
    promo_p: frm => sync_and_recalc(frm, 'youth_y', 'promo_p'),

    // -----------------------------
    // GUIDELINE / MARKET
    // -----------------------------
    as_per_guideline_value: recalculate_all,
    rate_for_sft: recalculate_all,
    as_per_market_rate: recalculate_all,
    mr_rate_for_sft: recalculate_all,

    // -----------------------------
    // APPROVED / ACTUAL
    // -----------------------------
    ae_per_approved_plan: recalculate_all,
    rp_as_per_approved_plan: recalculate_all,
    as_per_actual_2: recalculate_all,
    vp_as_per_actual: recalculate_all,
    rate_2: recalculate_all,
    iu_i: recalculate_all,

    // -----------------------------
    // AMENITIES
    // -----------------------------
    water_sump: recalculate_all,
    septic_tank: recalculate_all,
    bore: recalculate_all,
    head_room: recalculate_all,
    lo_l: recalculate_all,
    ty_t: recalculate_all,
    tl_t: recalculate_all,
    mn_m: recalculate_all
});

/* =====================================================
   HELPERS
===================================================== */

const n = v => flt(v || 0);

function sync_and_recalc(frm, target, source) {
    frm.set_value(target, n(frm.doc[source]));
    recalculate_all(frm);
}

/* =====================================================
   MASTER PIPELINE (ONE ENTRY POINT)
===================================================== */

function recalculate_all(frm) {
    calculate_areas(frm);
    calculate_guideline_market(frm);
    calculate_approved_actual(frm);
    calculate_amenities_and_totals(frm);
    calculate_summary(frm);
}

/* =====================================================
   AREA CALCULATIONS
===================================================== */

function calculate_areas(frm) {

    const yt = n(frm.doc.yt);
    const priya = n(frm.doc.priya_p);
    const cf = n(frm.doc.cf_c);
    const promo = n(frm.doc.promo_p);

    frm.set_value('freedom', yt + priya);

    const hg = yt * 0.9;
    const remo = priya * 0.9;
    frm.set_value('hg', hg);
    frm.set_value('remo_r', remo);
    frm.set_value('total_in_sft', hg + remo);

    const dc = cf * 0.9;
    const board = promo * 0.9;
    frm.set_value('dc', dc);
    frm.set_value('board_er', board);
    frm.set_value('cp_total_in_sft', dc + board);

    frm.set_value('to_total_in_sft', n(frm.doc.jn) + n(frm.doc.vidu_r));
    frm.set_value('fortness', n(frm.doc.fr) + n(frm.doc.youth_y));
    frm.set_value('sa_total_in_sft', n(frm.doc.fr) + n(frm.doc.youth_y));
}

/* =====================================================
   GUIDELINE & MARKET
===================================================== */

function calculate_guideline_market(frm) {

    frm.set_value(
        'tron',
        n(frm.doc.as_per_guideline_value) * n(frm.doc.rate_for_sft)
    );

    frm.set_value(
        'dr_d',
        n(frm.doc.as_per_market_rate) * n(frm.doc.mr_rate_for_sft)
    );
}

/* =====================================================
   APPROVED & ACTUAL
===================================================== */

function calculate_approved_actual(frm) {

    const hit =
        n(frm.doc.ae_per_approved_plan) * n(frm.doc.rate_2);

    const float_htmj =
        n(frm.doc.rp_as_per_approved_plan) * n(frm.doc.iu_i);

    const jack =
        n(frm.doc.vp_as_per_actual) * n(frm.doc.rate_2);

    const ip_i =
        n(frm.doc.as_per_actual_2) * n(frm.doc.iu_i);

    frm.set_value('hit', hit);
    frm.set_value('float_htmj', float_htmj);
    frm.set_value('jack', jack);
    frm.set_value('ip_i', ip_i);

    frm.set_value('ravi', hit + float_htmj);
    frm.set_value('ipl_i', jack + ip_i);
}

/* =====================================================
   AMENITIES & TOTALS
===================================================== */

function calculate_amenities_and_totals(frm) {

    const amenities =
        n(frm.doc.water_sump) +
        n(frm.doc.septic_tank) +
        n(frm.doc.bore) +
        n(frm.doc.head_room);

    const amenities_alt =
        n(frm.doc.lo_l) +
        n(frm.doc.ty_t) +
        n(frm.doc.tl_t) +
        n(frm.doc.mn_m);

    frm.set_value('amentities', amenities);
    frm.set_value('jkl_j', amenities_alt);

    const building = n(frm.doc.ravi) + amenities;
    const building_alt = n(frm.doc.ipl_i) + amenities_alt;

    frm.set_value('total_buliding_value_amentities', building);
    frm.set_value('jk_total_buliding_amentities', building_alt);

    frm.set_value('total_guide_line', n(frm.doc.tron) + building);
    frm.set_value('iopl_total_guide_line', n(frm.doc.tron) + building_alt);

    frm.set_value('total_fair_market_value', n(frm.doc.dr_d) + building);
    frm.set_value('khj_total_fair_market', n(frm.doc.dr_d) + building_alt);

    frm.set_value('realizable_value', n(frm.doc.total_fair_market_value) * 0.9);
    frm.set_value('piol_realizable_value', n(frm.doc.khj_total_fair_market) * 0.9);

    frm.set_value('forced_distressed_value', n(frm.doc.total_fair_market_value) * 0.8);
    frm.set_value('yuo_forced_distressed_value', n(frm.doc.khj_total_fair_market) * 0.8);
}

/* =====================================================
   SUMMARY (READ-ONLY, FINAL OUTPUT)
===================================================== */

function calculate_summary(frm) {

    frm.set_value('uoyt_glr_value', n(frm.doc.total_guide_line));
    frm.set_value('glr_value', n(frm.doc.iopl_total_guide_line));

    frm.set_value('iuyt_market_value', n(frm.doc.total_fair_market_value));
    frm.set_value('fair_market', n(frm.doc.khj_total_fair_market));

    frm.set_value('uyt_realisable_value', n(frm.doc.realizable_value));
    frm.set_value('realisable_value', n(frm.doc.piol_realizable_value));

    frm.set_value('iutyre_distress_sale_value', n(frm.doc.forced_distressed_value));
    frm.set_value('ip_distress_sale_value', n(frm.doc.yuo_forced_distressed_value));
    frm.set_value( 'net_cost_after_depreciation', n(frm.doc.ravi) );
    frm.set_value( 'net_cost_after_depreciation_1', n(frm.doc.ipl_i) );
}
