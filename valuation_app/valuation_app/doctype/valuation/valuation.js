// Copyright (c) 2025, dharineesh and contributors
// For license information, please see license.txt

frappe.ui.form.on('Valuation', {

    refresh(frm) {
        // Only generate rows if table is empty or number of rows doesn't match
        if (!frm.doc.floor_details || frm.doc.floor_details.length === 0 ||
            (frm.doc.floor_details.length - 1) !== parseInt(frm.doc.number_of_floors)) {
            generate_floor_rows(frm);
        }
        if (!frm.doc.floor_details_approved || frm.doc.floor_details_approved.length === 0 ||
            (frm.doc.floor_details_approved.length - 1) !== parseInt(frm.doc.number_of_floors_approved)) {
            generate_floor_rows_approved(frm);
        }
        
        calculate_floor_totals(frm);
        calculate_floor_totals_approved(frm);
        make_total_row_readonly(frm, 'floor_details');
        make_total_row_readonly(frm, 'floor_details_approved');
        
        setTimeout(() => {
            if (!frm.doc.floor_area_calculation || frm.doc.floor_area_calculation.length === 0) {
                generate_floor_area_calculation(frm);
            } else {
                update_floor_area_calculation_plinth_values(frm);
            }
            calculate_floor_area_calculation(frm);
        }, 100);
        
        recalculate_all(frm);
    },

    // -----------------------------
    // NUMBER OF FLOORS
    // -----------------------------
    number_of_floors: frm => {
        generate_floor_rows(frm);
        calculate_floor_totals(frm);
        make_total_row_readonly(frm, 'floor_details');
        generate_floor_area_calculation(frm);
        calculate_floor_area_calculation(frm);
        recalculate_all(frm);
    },

    // -----------------------------
    // NUMBER OF FLOORS APPROVED
    // -----------------------------
    number_of_floors_approved: frm => {
        generate_floor_rows_approved(frm);
        calculate_floor_totals_approved(frm);
        make_total_row_readonly(frm, 'floor_details_approved');
        generate_floor_area_calculation(frm);
        calculate_floor_area_calculation(frm);
        recalculate_all(frm);
    },

    // -----------------------------
    // SALEABLE AREA (L45) - triggers deviation recalculation
    // -----------------------------
    scaleable_area: frm => {
        recalculate_all(frm);
    },

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

// =====================================================
// CHILD TABLE EVENTS - Floor Details (As Per Actual)
// =====================================================
frappe.ui.form.on('Floor Detail', {
    plinth_area: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.floor_type !== 'Total in Sq.Ft') {
            row.carpet_area = n(row.plinth_area) * 0.9;
            row.saleable_area = n(row.plinth_area);
            frm.refresh_field('floor_details');
        }
        calculate_floor_totals(frm);
        update_floor_area_calculation_plinth_values(frm);
        calculate_floor_area_calculation(frm);
        recalculate_all(frm);
    },
    carpet_area: function(frm, cdt, cdn) {
        calculate_floor_totals(frm);
        recalculate_all(frm);
    },
    saleable_area: function(frm, cdt, cdn) {
        calculate_floor_totals(frm);
        recalculate_all(frm);
    },
    floor_details_remove: function(frm) {
        calculate_floor_totals(frm);
        recalculate_all(frm);
    }
});

// =====================================================
// CHILD TABLE EVENTS - Floor Details Approved
// =====================================================
frappe.ui.form.on('Floor Detail Approved', {
    plinth_area: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.floor_type !== 'Total in Sq.Ft') {
            row.carpet_area = n(row.plinth_area) * 0.9;
            row.saleable_area = n(row.plinth_area);
            frm.refresh_field('floor_details_approved');
        }
        calculate_floor_totals_approved(frm);
        update_floor_area_calculation_plinth_values(frm);
        calculate_floor_area_calculation(frm);
        recalculate_all(frm);
    },
    carpet_area: function(frm, cdt, cdn) {
        calculate_floor_totals_approved(frm);
        recalculate_all(frm);
    },
    saleable_area: function(frm, cdt, cdn) {
        calculate_floor_totals_approved(frm);
        recalculate_all(frm);
    },
    floor_details_approved_remove: function(frm) {
        calculate_floor_totals_approved(frm);
        recalculate_all(frm);
    }
});

// =====================================================
// CHILD TABLE EVENTS - Floor Area Calculation
// =====================================================
frappe.ui.form.on('Floor Area Calculation', {
    rate: function(frm, cdt, cdn) {
        calculate_floor_area_calculation(frm);
        recalculate_all(frm);
    },
    floor_area_calculation_remove: function(frm) {
        calculate_floor_area_calculation(frm);
        recalculate_all(frm);
    }
});

/* =====================================================
   HELPERS
===================================================== */

const n = v => flt(v || 0);

// Update plinth values WITHOUT clearing rates
function update_floor_area_calculation_plinth_values(frm) {
    if (!frm.doc.floor_area_calculation || frm.doc.floor_area_calculation.length === 0) {
        return;
    }
    
    const actualPlinthAreas = {};
    if (frm.doc.floor_details) {
        frm.doc.floor_details.forEach(floor => {
            if (floor.floor_type && floor.floor_type !== 'Total in Sq.Ft') {
                actualPlinthAreas[floor.floor_type] = n(floor.plinth_area);
            }
        });
    }
    
    const approvedPlinthAreas = {};
    if (frm.doc.floor_details_approved) {
        frm.doc.floor_details_approved.forEach(floor => {
            if (floor.floor_type && floor.floor_type !== 'Total in Sq.Ft') {
                approvedPlinthAreas[floor.floor_type] = n(floor.plinth_area);
            }
        });
    }
    
    frm.doc.floor_area_calculation.forEach(row => {
        if (row.floor_type === 'Total') return;
        row.as_per_approved_plan = approvedPlinthAreas[row.floor_type] || 0;
        row.as_per_actual = actualPlinthAreas[row.floor_type] || 0;
        // DON'T touch row.rate - preserve it!
    });
    
    frm.refresh_field('floor_area_calculation');
}

// Generate Floor Area Calculation rows
function generate_floor_area_calculation(frm) {
    // Save existing rates before clearing
    const existingRates = {};
    if (frm.doc.floor_area_calculation) {
        frm.doc.floor_area_calculation.forEach(row => {
            if (row.floor_type && row.floor_type !== 'Total') {
                existingRates[row.floor_type] = n(row.rate);
            }
        });
    }
    
    frm.clear_table('floor_area_calculation');
    
    const actualFloors = [];
    if (frm.doc.floor_details) {
        frm.doc.floor_details.forEach(floor => {
            if (floor.floor_type && floor.floor_type !== 'Total in Sq.Ft') {
                actualFloors.push({
                    floor_type: floor.floor_type,
                    plinth_area: n(floor.plinth_area)
                });
            }
        });
    }
    
    const approvedFloors = [];
    if (frm.doc.floor_details_approved) {
        frm.doc.floor_details_approved.forEach(floor => {
            if (floor.floor_type && floor.floor_type !== 'Total in Sq.Ft') {
                approvedFloors.push({
                    floor_type: floor.floor_type,
                    plinth_area: n(floor.plinth_area)
                });
            }
        });
    }
    
    const maxFloors = Math.max(actualFloors.length, approvedFloors.length);
    
    for (let i = 0; i < maxFloors; i++) {
        const actualFloor   = actualFloors[i]   || { floor_type: '', plinth_area: 0 };
        const approvedFloor = approvedFloors[i] || { floor_type: '', plinth_area: 0 };
        const floorType = approvedFloor.floor_type || actualFloor.floor_type || 'Floor ' + (i + 1);
        
        const row = frm.add_child('floor_area_calculation');
        row.floor_type              = floorType;
        row.as_per_approved_plan    = approvedFloor.plinth_area;
        row.as_per_actual           = actualFloor.plinth_area;
        row.rate                    = existingRates[floorType] || 0;  // Restore saved rate
        row.total_as_per_approved_plan = 0;
        row.total_as_per_actual        = 0;
    }
    
    // Add total row
    const totalRow = frm.add_child('floor_area_calculation');
    totalRow.floor_type                = 'Total';
    totalRow.as_per_approved_plan      = 0;
    totalRow.as_per_actual             = 0;
    totalRow.rate                      = approvedFloors.length;
    totalRow.total_as_per_approved_plan = 0;
    totalRow.total_as_per_actual        = 0;
    
    frm.refresh_field('floor_area_calculation');
}

// Calculate Floor Area Calculation totals
function calculate_floor_area_calculation(frm) {
    if (!frm.doc.floor_area_calculation || frm.doc.floor_area_calculation.length === 0) {
        return;
    }
    
    let numFloorsApproved = 0;
    if (frm.doc.floor_details_approved) {
        numFloorsApproved = frm.doc.floor_details_approved.filter(
            f => f.floor_type && f.floor_type !== 'Total in Sq.Ft'
        ).length;
    }
    
    let totalApproved = 0;
    let totalActual   = 0;
    
    frm.doc.floor_area_calculation.forEach(row => {
        if (row.floor_type === 'Total') return;
        
        const rate          = n(row.rate);
        const asPerApproved = n(row.as_per_approved_plan);
        const asPerActual   = n(row.as_per_actual);
        
        row.total_as_per_approved_plan = asPerApproved * rate;
        row.total_as_per_actual        = asPerActual   * rate;
        
        totalApproved += row.total_as_per_approved_plan;
        totalActual   += row.total_as_per_actual;
    });
    
    const totalRowIndex = frm.doc.floor_area_calculation.length - 1;
    if (totalRowIndex >= 0) {
        const totalRow = frm.doc.floor_area_calculation[totalRowIndex];
        if (totalRow.floor_type === 'Total') {
            totalRow.rate                      = numFloorsApproved;
            totalRow.total_as_per_approved_plan = totalApproved;
            totalRow.total_as_per_actual        = totalActual;
        }
    }
    
    frm.refresh_field('floor_area_calculation');
}

// Make total row read-only in floor tables
function make_total_row_readonly(frm, table_fieldname) {
    if (frm.doc[table_fieldname] && frm.doc[table_fieldname].length > 0) {
        const totalRowIndex = frm.doc[table_fieldname].length - 1;

        setTimeout(() => {
            if (frm.fields_dict[table_fieldname] && frm.fields_dict[table_fieldname].grid) {
                const grid     = frm.fields_dict[table_fieldname].grid;
                const grid_row = grid.grid_rows[totalRowIndex];
                
                if (grid_row) {
                    ['plinth_area', 'carpet_area', 'saleable_area', 'remarks'].forEach(fieldname => {
                        const field = grid_row.get_field(fieldname);
                        if (field && field.$input) {
                            field.$input.prop('disabled', true);
                            field.$input.css({
                                'background-color': '#f8f9fa',
                                'cursor': 'not-allowed',
                                'opacity': '0.6'
                            });
                        }
                    });
                    
                    const floor_type_field = grid_row.get_field('floor_type');
                    if (floor_type_field && floor_type_field.$input) {
                        floor_type_field.$input.prop('disabled', true);
                        floor_type_field.$input.css({
                            'background-color': '#f8f9fa',
                            'cursor': 'not-allowed',
                            'opacity': '0.6'
                        });
                    }
                }
            }
        }, 100);
    }
}

/* =====================================================
   MASTER PIPELINE
===================================================== */

function recalculate_all(frm) {
    calculate_guideline_market(frm);
    calculate_approved_actual(frm);
    calculate_amenities_and_totals(frm);
    calculate_deviations(frm);
    calculate_summary(frm);
}

/* =====================================================
   GENERATE FLOOR ROWS (As Per Actual)
===================================================== */

function generate_floor_rows(frm) {
    const numFloors = parseInt(frm.doc.number_of_floors) || 1;

    frm.clear_table('floor_details');

    const floorTypes = [
        'Ground Floor', 'First Floor', 'Second Floor', 'Third Floor',
        'Fourth Floor', 'Fifth Floor', 'Sixth Floor', 'Seventh Floor', 'Eighth Floor'
    ];

    for (let i = 0; i < numFloors; i++) {
        const row = frm.add_child('floor_details');
        row.floor_type   = floorTypes[i];
        row.plinth_area  = 0;
        row.carpet_area  = 0;
        row.saleable_area = 0;
        row.remarks      = '';
    }

    const totalRow = frm.add_child('floor_details');
    totalRow.floor_type   = 'Total in Sq.Ft';
    totalRow.plinth_area  = 0;
    totalRow.carpet_area  = 0;
    totalRow.saleable_area = 0;
    totalRow.remarks      = '';

    frm.refresh_field('floor_details');
    setTimeout(() => make_total_row_readonly(frm, 'floor_details'), 200);
}

/* =====================================================
   FLOOR TOTALS CALCULATION (As Per Actual)
===================================================== */

function calculate_floor_totals(frm) {
    let total_plinth   = 0;
    let total_carpet   = 0;
    let total_saleable = 0;

    if (frm.doc.floor_details && frm.doc.floor_details.length > 0) {
        frm.doc.floor_details.forEach(floor => {
            if (floor.floor_type === 'Total in Sq.Ft') return;
            total_plinth   += n(floor.plinth_area);
            total_carpet   += n(floor.carpet_area);
            total_saleable += n(floor.saleable_area);
        });

        const totalRowIndex = frm.doc.floor_details.length - 1;
        if (totalRowIndex >= 0) {
            const totalRow = frm.doc.floor_details[totalRowIndex];
            
            if (totalRow.name && locals[totalRow.doctype] && locals[totalRow.doctype][totalRow.name]) {
                locals[totalRow.doctype][totalRow.name].plinth_area   = total_plinth;
                locals[totalRow.doctype][totalRow.name].carpet_area   = total_carpet;
                locals[totalRow.doctype][totalRow.name].saleable_area = total_saleable;
            }
            
            totalRow.plinth_area   = total_plinth;
            totalRow.carpet_area   = total_carpet;
            totalRow.saleable_area = total_saleable;
            
            setTimeout(() => {
                if (frm.fields_dict.floor_details && frm.fields_dict.floor_details.grid) {
                    const grid     = frm.fields_dict.floor_details.grid;
                    const grid_row = grid.grid_rows && grid.grid_rows[totalRowIndex];
                    if (grid_row) {
                        const pf = grid_row.get_field('plinth_area');
                        const cf = grid_row.get_field('carpet_area');
                        const sf = grid_row.get_field('saleable_area');
                        if (pf && pf.$input) pf.$input.val(total_plinth);
                        if (cf && cf.$input) cf.$input.val(total_carpet);
                        if (sf && sf.$input) sf.$input.val(total_saleable);
                        grid_row.refresh();
                    }
                }
            }, 50);
        }
        
        frm.refresh_field('floor_details');
    }

    frm.set_value('vp_as_per_actual', total_plinth);
    frm.set_value('as_per_actual_2',  total_carpet);
    frm.refresh_field('vp_as_per_actual');
    frm.refresh_field('as_per_actual_2');
}

/* =====================================================
   GENERATE FLOOR ROWS (As Per Approved Plan)
===================================================== */

function generate_floor_rows_approved(frm) {
    const numFloors = parseInt(frm.doc.number_of_floors_approved) || 1;

    frm.clear_table('floor_details_approved');

    const floorTypes = [
        'Ground Floor', 'First Floor', 'Second Floor', 'Third Floor',
        'Fourth Floor', 'Fifth Floor', 'Sixth Floor', 'Seventh Floor', 'Eighth Floor'
    ];

    for (let i = 0; i < numFloors; i++) {
        const row = frm.add_child('floor_details_approved');
        row.floor_type   = floorTypes[i];
        row.plinth_area  = 0;
        row.carpet_area  = 0;
        row.saleable_area = 0;
        row.remarks      = '';
    }

    const totalRow = frm.add_child('floor_details_approved');
    totalRow.floor_type   = 'Total in Sq.Ft';
    totalRow.plinth_area  = 0;
    totalRow.carpet_area  = 0;
    totalRow.saleable_area = 0;
    totalRow.remarks      = '';

    frm.refresh_field('floor_details_approved');
    setTimeout(() => make_total_row_readonly(frm, 'floor_details_approved'), 200);
}

/* =====================================================
   FLOOR TOTALS CALCULATION (As Per Approved Plan)
===================================================== */

function calculate_floor_totals_approved(frm) {
    let total_plinth   = 0;
    let total_carpet   = 0;
    let total_saleable = 0;

    if (frm.doc.floor_details_approved && frm.doc.floor_details_approved.length > 0) {
        frm.doc.floor_details_approved.forEach(floor => {
            if (floor.floor_type === 'Total in Sq.Ft') return;
            total_plinth   += n(floor.plinth_area);
            total_carpet   += n(floor.carpet_area);
            total_saleable += n(floor.saleable_area);
        });

        const totalRowIndex = frm.doc.floor_details_approved.length - 1;
        if (totalRowIndex >= 0) {
            const totalRow = frm.doc.floor_details_approved[totalRowIndex];
            
            if (totalRow.name && locals[totalRow.doctype] && locals[totalRow.doctype][totalRow.name]) {
                locals[totalRow.doctype][totalRow.name].plinth_area   = total_plinth;
                locals[totalRow.doctype][totalRow.name].carpet_area   = total_carpet;
                locals[totalRow.doctype][totalRow.name].saleable_area = total_saleable;
            }
            
            totalRow.plinth_area   = total_plinth;
            totalRow.carpet_area   = total_carpet;
            totalRow.saleable_area = total_saleable;
            
            setTimeout(() => {
                if (frm.fields_dict.floor_details_approved && frm.fields_dict.floor_details_approved.grid) {
                    const grid     = frm.fields_dict.floor_details_approved.grid;
                    const grid_row = grid.grid_rows && grid.grid_rows[totalRowIndex];
                    if (grid_row) {
                        const pf = grid_row.get_field('plinth_area');
                        const cf = grid_row.get_field('carpet_area');
                        const sf = grid_row.get_field('saleable_area');
                        if (pf && pf.$input) pf.$input.val(total_plinth);
                        if (cf && cf.$input) cf.$input.val(total_carpet);
                        if (sf && sf.$input) sf.$input.val(total_saleable);
                        grid_row.refresh();
                    }
                }
            }, 50);
        }
        
        frm.refresh_field('floor_details_approved');
    }

    frm.set_value('ae_per_approved_plan',    total_plinth);
    frm.set_value('rp_as_per_approved_plan', total_carpet);
    frm.refresh_field('ae_per_approved_plan');
    frm.refresh_field('rp_as_per_approved_plan');
}

/* =====================================================
   GUIDELINE & MARKET
===================================================== */

function calculate_guideline_market(frm) {
    frm.set_value('tron', n(frm.doc.as_per_guideline_value) * n(frm.doc.rate_for_sft));
    frm.set_value('dr_d', n(frm.doc.as_per_market_rate)    * n(frm.doc.mr_rate_for_sft));
    frm.set_value('realisable_value_for_market_land_rate',   n(frm.doc.dr_d) * 0.9);
    frm.set_value('forced_distressed_value_for_market_land_rate', n(frm.doc.dr_d) * 0.8);
}

/* =====================================================
   APPROVED & ACTUAL
===================================================== */

function calculate_approved_actual(frm) {
    const hit       = n(frm.doc.ae_per_approved_plan)    * n(frm.doc.rate_2);
    const float_htmj = n(frm.doc.rp_as_per_approved_plan) * n(frm.doc.iu_i);
    const jack      = n(frm.doc.vp_as_per_actual)        * n(frm.doc.rate_2);
    const ip_i      = n(frm.doc.as_per_actual_2)         * n(frm.doc.iu_i);

    frm.set_value('hit',        hit);
    frm.set_value('float_htmj', float_htmj);
    frm.set_value('jack',       jack);
    frm.set_value('ip_i',       ip_i);
    frm.set_value('ravi',       hit + float_htmj);
    frm.set_value('ipl_i',      jack + ip_i);
}

/* =====================================================
   AMENITIES & TOTALS
===================================================== */

function calculate_amenities_and_totals(frm) {
    const amenities = n(frm.doc.water_sump) + n(frm.doc.septic_tank)
                    + n(frm.doc.bore)       + n(frm.doc.head_room);

    const amenities_alt = n(frm.doc.lo_l) + n(frm.doc.ty_t)
                        + n(frm.doc.tl_t) + n(frm.doc.mn_m);

    frm.set_value('amentities', amenities);
    frm.set_value('jkl_j',      amenities_alt);

    let floorAreaTotalApproved = 0;
    let floorAreaTotalActual   = 0;
    
    if (frm.doc.floor_area_calculation && frm.doc.floor_area_calculation.length > 0) {
        const totalRow = frm.doc.floor_area_calculation.find(row => row.floor_type === 'Total');
        if (totalRow) {
            floorAreaTotalApproved = n(totalRow.total_as_per_approved_plan);
            floorAreaTotalActual   = n(totalRow.total_as_per_actual);
        }
    }

    const building     = amenities     + floorAreaTotalApproved;
    const building_alt = amenities_alt + floorAreaTotalActual;

    frm.set_value('total_buliding_value_amentities', building);
    frm.set_value('jk_total_buliding_amentities',    building_alt);

    frm.set_value('total_guide_line',      n(frm.doc.tron) + building);
    frm.set_value('iopl_total_guide_line', n(frm.doc.tron) + building_alt);

    frm.set_value('total_fair_market_value', n(frm.doc.dr_d) + building);
    frm.set_value('khj_total_fair_market',   n(frm.doc.dr_d) + building_alt);

    frm.set_value('realizable_value',       n(frm.doc.total_fair_market_value) * 0.9);
    frm.set_value('piol_realizable_value',  n(frm.doc.khj_total_fair_market)   * 0.9);

    frm.set_value('forced_distressed_value',      n(frm.doc.total_fair_market_value) * 0.8);
    frm.set_value('yuo_forced_distressed_value',  n(frm.doc.khj_total_fair_market)   * 0.8);
}

/* =====================================================
   DEVIATIONS - GROUND FLOOR ONLY
   Formula: =((E49/L45)*100%-((E54/L45)*100%))
   E49 = Ground Floor plinth from floor_details        (As Per Actual)
   E54 = Ground Floor plinth from floor_details_approved (As Per Approved Plan)
   L45 = scaleable_area (Saleable Area)
===================================================== */

function calculate_deviations(frm) {
    const scaleable_area = n(frm.doc.scaleable_area);

    // Get Ground Floor plinth from As Per Actual only
    let actual_ground = 0;
    if (frm.doc.floor_details) {
        const gf = frm.doc.floor_details.find(
            f => (f.floor_type || '').trim().toLowerCase() === 'ground floor'
        );
        if (gf) actual_ground = n(gf.plinth_area);
    }

    // Get Ground Floor plinth from As Per Approved Plan only
    let approved_ground = 0;
    if (frm.doc.floor_details_approved) {
        const gf = frm.doc.floor_details_approved.find(
            f => (f.floor_type || '').trim().toLowerCase() === 'ground floor'
        );
        if (gf) approved_ground = n(gf.plinth_area);
    }

    if (scaleable_area) {
        const actual_pct   = (actual_ground   / scaleable_area) * 100;
        const approved_pct = (approved_ground / scaleable_area) * 100;
        frm.set_value('horizontal_deviation', actual_pct - approved_pct);
    } else {
        frm.set_value('horizontal_deviation', 0);
    }
}

/* =====================================================
   SUMMARY
===================================================== */

function calculate_summary(frm) {
    frm.set_value('uoyt_glr_value',          n(frm.doc.total_guide_line));
    frm.set_value('glr_value',               n(frm.doc.iopl_total_guide_line));
    frm.set_value('iuyt_market_value',        n(frm.doc.total_fair_market_value));
    frm.set_value('fair_market',             n(frm.doc.khj_total_fair_market));
    frm.set_value('uyt_realisable_value',     n(frm.doc.realizable_value));
    frm.set_value('realisable_value',        n(frm.doc.piol_realizable_value));
    frm.set_value('iutyre_distress_sale_value', n(frm.doc.forced_distressed_value));
    frm.set_value('ip_distress_sale_value',   n(frm.doc.yuo_forced_distressed_value));

    let floorAreaTotalApproved = 0;
    let floorAreaTotalActual   = 0;
    
    if (frm.doc.floor_area_calculation && frm.doc.floor_area_calculation.length > 0) {
        const totalRow = frm.doc.floor_area_calculation.find(row => row.floor_type === 'Total');
        if (totalRow) {
            floorAreaTotalApproved = n(totalRow.total_as_per_approved_plan);
            floorAreaTotalActual   = n(totalRow.total_as_per_actual);
        }
    }
        
    frm.set_value('net_cost_after_depreciation',   floorAreaTotalApproved);
    frm.set_value('net_cost_after_depreciation_1', floorAreaTotalActual);
}

// End of file