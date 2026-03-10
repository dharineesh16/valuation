// Copyright (c) 2025, dharineesh and contributors
// For license information, please see license.txt

frappe.ui.form.on('Valuation', {

    refresh(frm) {
        const numFloors         = parseInt(frm.doc.number_of_floors) || 1;
        const numFloorsApproved = parseInt(frm.doc.number_of_floors_approved) || 1;

        ensure_floor_tables_visible(frm);

        if (!frm.doc.floor_details || frm.doc.floor_details.length === 0) {
            generate_floor_rows(frm);
        } else if ((frm.doc.floor_details.length - 1) !== numFloors) {
            generate_floor_rows(frm);
        }

        if (!frm.doc.floor_details_approved || frm.doc.floor_details_approved.length === 0) {
            generate_floor_rows_approved(frm);
        } else if ((frm.doc.floor_details_approved.length - 1) !== numFloorsApproved) {
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
            
            // Generate amenities table if not exists
            if (!frm.doc.amenities || frm.doc.amenities.length === 0) {
                generate_amenities_rows(frm);
            }
            calculate_amenities_table_values(frm);
            
            recalculate_all(frm);
        }, 300);
    },

    number_of_floors(frm) {
        generate_floor_rows(frm);
        calculate_floor_totals(frm);
        make_total_row_readonly(frm, 'floor_details');
        setTimeout(() => {
            generate_floor_area_calculation(frm);
            calculate_floor_area_calculation(frm);
            recalculate_all(frm);
        }, 100);
    },

    number_of_floors_approved(frm) {
        generate_floor_rows_approved(frm);
        calculate_floor_totals_approved(frm);
        make_total_row_readonly(frm, 'floor_details_approved');
        setTimeout(() => {
            generate_floor_area_calculation(frm);
            calculate_floor_area_calculation(frm);
            recalculate_all(frm);
        }, 100);
    },

    scaleable_area(frm)         { recalculate_all(frm); },
    as_per_guideline_value(frm) { recalculate_all(frm); },
    rate_for_sft(frm)           { recalculate_all(frm); },
    as_per_market_rate(frm)     { recalculate_all(frm); },
    mr_rate_for_sft(frm)        { recalculate_all(frm); },

    amenities(frm) {
        setTimeout(() => {
            if (!frm.doc.amenities || frm.doc.amenities.length === 0) {
                generate_amenities_rows(frm);
            }
            calculate_amenities_table_values(frm);
            recalculate_all(frm);
        }, 100);
    },

    floor_details(frm) {
        setTimeout(() => recalculate_all(frm), 100);
    },
    floor_details_approved(frm) {
        setTimeout(() => recalculate_all(frm), 100);
    }
});

// =====================================================
// CHILD TABLE - Floor Details (As Per Actual)
// =====================================================
frappe.ui.form.on('Floor Detail', {
    plinth_area(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.floor_type !== 'Total in Sq.Ft') {
            row.carpet_area   = n(row.plinth_area) * 0.9;
            row.saleable_area = n(row.plinth_area);
            frm.refresh_field('floor_details');
        }
        calculate_floor_totals(frm);
        update_floor_area_calculation_plinth_values(frm);
        calculate_floor_area_calculation(frm);
        recalculate_all(frm);
    },
    carpet_area(frm)          { calculate_floor_totals(frm); recalculate_all(frm); },
    saleable_area(frm)        { calculate_floor_totals(frm); recalculate_all(frm); },
    floor_details_remove(frm) { calculate_floor_totals(frm); recalculate_all(frm); }
});

// =====================================================
// CHILD TABLE - Floor Details Approved
// =====================================================
frappe.ui.form.on('Floor Detail Approved', {
    plinth_area(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.floor_type !== 'Total in Sq.Ft') {
            row.carpet_area   = n(row.plinth_area) * 0.9;
            row.saleable_area = n(row.plinth_area);
            frm.refresh_field('floor_details_approved');
        }
        calculate_floor_totals_approved(frm);
        update_floor_area_calculation_plinth_values(frm);
        calculate_floor_area_calculation(frm);
        recalculate_all(frm);
    },
    carpet_area(frm)                   { calculate_floor_totals_approved(frm); recalculate_all(frm); },
    saleable_area(frm)                 { calculate_floor_totals_approved(frm); recalculate_all(frm); },
    floor_details_approved_remove(frm) { calculate_floor_totals_approved(frm); recalculate_all(frm); }
});

// =====================================================
// CHILD TABLE - Amenities Details
// =====================================================
frappe.ui.form.on('Amenities', {
    as_per_approved_plan(frm, cdt, cdn) {
        calculate_amenities_table_values(frm);
        recalculate_all(frm);
    },
    as_per_actual(frm, cdt, cdn) {
        calculate_amenities_table_values(frm);
        recalculate_all(frm);
    },
    amenities_add(frm) {
        setTimeout(() => generate_amenities_rows(frm), 100);
    },
    amenities_remove(frm) {
        calculate_amenities_table_values(frm);
        recalculate_all(frm);
    }
});

// =====================================================
// GENERATE AMENITIES ROWS
// =====================================================
function generate_amenities_rows(frm) {
    const amenityTypes = [
        'Water Sump',
        'Septic Tank',
        'Bore',
        'Head Room'
    ];
    
    const existing = {};
    (frm.doc.amenities || []).forEach(r => {
        if (r.amenity_type) existing[r.amenity_type] = {
            as_per_approved_plan: n(r.as_per_approved_plan),
            as_per_actual: n(r.as_per_actual)
        };
    });
    
    frm.clear_table('amenities');
    
    amenityTypes.forEach(type => {
        const row = frm.add_child('amenities');
        row.amenity_type = type;
        const sv = existing[type] || {};
        row.as_per_approved_plan = sv.as_per_approved_plan || 0;
        row.as_per_actual = sv.as_per_actual || 0;
    });
    
    frm.refresh_field('amenities');
}

// =====================================================
// CALCULATE AMENITIES TABLE VALUES
// =====================================================
function calculate_amenities_table_values(frm) {
    if (!frm.doc.amenities || !frm.doc.amenities.length) return;
    
    // Get individual amenities values from the table
    const waterSumpAP = n(get_amenity_value(frm, 'Water Sump', 'as_per_approved_plan'));
    const septicTankAP = n(get_amenity_value(frm, 'Septic Tank', 'as_per_approved_plan'));
    const boreAP = n(get_amenity_value(frm, 'Bore', 'as_per_approved_plan'));
    const headRoomAP = n(get_amenity_value(frm, 'Head Room', 'as_per_approved_plan'));
    
    const waterSumpAA = n(get_amenity_value(frm, 'Water Sump', 'as_per_actual'));
    const septicTankAA = n(get_amenity_value(frm, 'Septic Tank', 'as_per_actual'));
    const boreAA = n(get_amenity_value(frm, 'Bore', 'as_per_actual'));
    const headRoomAA = n(get_amenity_value(frm, 'Head Room', 'as_per_actual'));
    
    // Calculate Amenities (sum of individual)
    const amenitiesAP = waterSumpAP + septicTankAP + boreAP + headRoomAP;
    const amenitiesAA = waterSumpAA + septicTankAA + boreAA + headRoomAA;
    
    // Get net_cost_after_depreciation values from floor_area_calculation
    let netCostAP = 0, netCostAA = 0;
    const tr = (frm.doc.floor_area_calculation || []).find(r => r.floor_type === 'Total');
    if (tr) {
        netCostAP = n(tr.total_as_per_approved_plan);  // Total As Per Approved Plan
        netCostAA = n(tr.total_as_per_actual);          // Total As Per Actual
    }
    
    // Update net cost fields
    frm.doc.net_cost_after_depreciation = netCostAP;
    frm.doc.net_cost_after_depreciation_1 = netCostAA;
    
    // Total Building Value + Amenities = net_cost + amenities
    const totalBuildingAP = netCostAP + amenitiesAP;
    const totalBuildingAA = netCostAA + amenitiesAA;
    
    // Total Guide Line Value = tron + total building value
    const tron = n(frm.doc.tron) || 0;
    const totalGuideLineAP = tron + totalBuildingAP;
    const totalGuideLineAA = tron + totalBuildingAA;
    
    // Total Fair Market Value = dr_d + total building value
    const drd = n(frm.doc.dr_d) || 0;
    const totalFairMarketAP = drd + totalBuildingAP;
    const totalFairMarketAA = drd + totalBuildingAA;
    
    // Realizable Value 90% = fair market value * 0.9
    const realizableAP = totalFairMarketAP * 0.9;
    const realizableAA = totalFairMarketAA * 0.9;
    
    // Forced Distressed Value 80% = fair market value * 0.8
    const forcedAP = totalFairMarketAP * 0.8;
    const forcedAA = totalFairMarketAA * 0.8;
    
    // Set values in main form fields (read-only)
    frm.doc.amentities = amenitiesAP;
    frm.doc.jkl_j = amenitiesAA;
    frm.doc.total_buliding_value_amentities = totalBuildingAP;
    frm.doc.jk_total_buliding_amentities = totalBuildingAA;
    frm.doc.total_guide_line = totalGuideLineAP;
    frm.doc.iopl_total_guide_line = totalGuideLineAA;
    frm.doc.total_fair_market_value = totalFairMarketAP;
    frm.doc.khj_total_fair_market = totalFairMarketAA;
    frm.doc.realizable_value = realizableAP;
    frm.doc.piol_realizable_value = realizableAA;
    frm.doc.forced_distressed_value = forcedAP;
    frm.doc.yuo_forced_distressed_value = forcedAA;
    
    frm.refresh_field('amentities');
    frm.refresh_field('jkl_j');
    frm.refresh_field('total_buliding_value_amentities');
    frm.refresh_field('jk_total_buliding_amentities');
    frm.refresh_field('total_guide_line');
    frm.refresh_field('iopl_total_guide_line');
    frm.refresh_field('total_fair_market_value');
    frm.refresh_field('khj_total_fair_market');
    frm.refresh_field('realizable_value');
    frm.refresh_field('piol_realizable_value');
    frm.refresh_field('forced_distressed_value');
    frm.refresh_field('yuo_forced_distressed_value');
    frm.refresh_field('net_cost_after_depreciation');
    frm.refresh_field('net_cost_after_depreciation_1');
}

// =====================================================
// GET AMENITY VALUE
// =====================================================
function get_amenity_value(frm, type, field) {
    if (!frm.doc.amenities) return 0;
    const row = frm.doc.amenities.find(r => r.amenity_type === type);
    return row ? n(row[field]) : 0;
}

// =====================================================
// SET AMENITY VALUE
// =====================================================
function set_amenity_value(frm, type, field, value) {
    if (!frm.doc.amenities) return;
    const row = frm.doc.amenities.find(r => r.amenity_type === type);
    if (row) {
        row[field] = value;
        if (row.name && locals[row.doctype] && locals[row.doctype][row.name]) {
            locals[row.doctype][row.name][field] = value;
        }
    }
}

// =====================================================
// CHILD TABLE - Floor Area Calculation
// =====================================================
frappe.ui.form.on('Floor Area Calculation', {
    rate(frm)                          { calculate_floor_area_calculation(frm); recalculate_all(frm); },
    floor_area_calculation_remove(frm) { calculate_floor_area_calculation(frm); recalculate_all(frm); }
});

/* ===================================================== */
const n = v => flt(v || 0);

function ensure_floor_tables_visible(frm) {
    ['floor_details', 'floor_details_approved', 'floor_area_calculation'].forEach(fieldname => {
        if (!frm.fields_dict[fieldname]) return;
        frm.set_df_property(fieldname, 'hidden', 0);
        frm.set_df_property(fieldname, 'read_only', 0);
        frm.refresh_field(fieldname);
    });
}

// =====================================================
// GENERATE FLOOR ROWS (As Per Actual)
// =====================================================
function generate_floor_rows(frm) {
    const numFloors  = parseInt(frm.doc.number_of_floors) || 1;
    const floorTypes = ['Ground Floor','First Floor','Second Floor','Third Floor',
                        'Fourth Floor','Fifth Floor','Sixth Floor','Seventh Floor','Eighth Floor'];
    const existing = {};
    (frm.doc.floor_details || []).forEach(r => {
        if (r.floor_type && r.floor_type !== 'Total in Sq.Ft')
            existing[r.floor_type] = {
                plinth_area: n(r.plinth_area), carpet_area: n(r.carpet_area),
                saleable_area: n(r.saleable_area), remarks: r.remarks || ''
            };
    });
    frm.clear_table('floor_details');
    for (let i = 0; i < numFloors; i++) {
        const ft  = floorTypes[i] || ('Floor ' + (i + 1));
        const row = frm.add_child('floor_details');
        const sv  = existing[ft] || {};
        row.floor_type    = ft;
        row.plinth_area   = sv.plinth_area   || 0;
        row.carpet_area   = sv.carpet_area   || 0;
        row.saleable_area = sv.saleable_area || 0;
        row.remarks       = sv.remarks       || '';
    }
    const tot = frm.add_child('floor_details');
    tot.floor_type = 'Total in Sq.Ft'; tot.plinth_area = 0; tot.carpet_area = 0; tot.saleable_area = 0;
    frm.refresh_field('floor_details');
    setTimeout(() => make_total_row_readonly(frm, 'floor_details'), 200);
}

// =====================================================
// GENERATE FLOOR ROWS (As Per Approved Plan)
// =====================================================
function generate_floor_rows_approved(frm) {
    const numFloors  = parseInt(frm.doc.number_of_floors_approved) || 1;
    const floorTypes = ['Ground Floor','First Floor','Second Floor','Third Floor',
                        'Fourth Floor','Fifth Floor','Sixth Floor','Seventh Floor','Eighth Floor'];
    const existing = {};
    (frm.doc.floor_details_approved || []).forEach(r => {
        if (r.floor_type && r.floor_type !== 'Total in Sq.Ft')
            existing[r.floor_type] = {
                plinth_area: n(r.plinth_area), carpet_area: n(r.carpet_area),
                saleable_area: n(r.saleable_area), remarks: r.remarks || ''
            };
    });
    frm.clear_table('floor_details_approved');
    for (let i = 0; i < numFloors; i++) {
        const ft  = floorTypes[i] || ('Floor ' + (i + 1));
        const row = frm.add_child('floor_details_approved');
        const sv  = existing[ft] || {};
        row.floor_type    = ft;
        row.plinth_area   = sv.plinth_area   || 0;
        row.carpet_area   = sv.carpet_area   || 0;
        row.saleable_area = sv.saleable_area || 0;
        row.remarks       = sv.remarks       || '';
    }
    const tot = frm.add_child('floor_details_approved');
    tot.floor_type = 'Total in Sq.Ft'; tot.plinth_area = 0; tot.carpet_area = 0; tot.saleable_area = 0;
    frm.refresh_field('floor_details_approved');
    setTimeout(() => make_total_row_readonly(frm, 'floor_details_approved'), 200);
}

// =====================================================
// FLOOR TOTALS (As Per Actual)
// =====================================================
function calculate_floor_totals(frm) {
    if (!frm.doc.floor_details || !frm.doc.floor_details.length) return;
    let tp = 0, tc = 0, ts = 0;
    frm.doc.floor_details.forEach(f => {
        if (f.floor_type === 'Total in Sq.Ft') return;
        tp += n(f.plinth_area); tc += n(f.carpet_area); ts += n(f.saleable_area);
    });
    const idx = frm.doc.floor_details.length - 1;
    const tr  = frm.doc.floor_details[idx];
    if (!tr) return;
    tr.plinth_area = tp; tr.carpet_area = tc; tr.saleable_area = ts;
    if (tr.name && locals[tr.doctype] && locals[tr.doctype][tr.name]) {
        locals[tr.doctype][tr.name].plinth_area   = tp;
        locals[tr.doctype][tr.name].carpet_area   = tc;
        locals[tr.doctype][tr.name].saleable_area = ts;
    }
    setTimeout(() => {
        const g = frm.fields_dict.floor_details && frm.fields_dict.floor_details.grid;
        if (!g) return;
        const gr = g.grid_rows[idx]; if (!gr) return;
        [['plinth_area',tp],['carpet_area',tc],['saleable_area',ts]].forEach(([f,v]) => {
            const fd = gr.get_field(f); if (fd && fd.$input) fd.$input.val(v);
        });
        gr.refresh();
    }, 50);
    frm.refresh_field('floor_details');
}

// =====================================================
// FLOOR TOTALS (As Per Approved Plan)
// =====================================================
function calculate_floor_totals_approved(frm) {
    if (!frm.doc.floor_details_approved || !frm.doc.floor_details_approved.length) return;
    let tp = 0, tc = 0, ts = 0;
    frm.doc.floor_details_approved.forEach(f => {
        if (f.floor_type === 'Total in Sq.Ft') return;
        tp += n(f.plinth_area); tc += n(f.carpet_area); ts += n(f.saleable_area);
    });
    const idx = frm.doc.floor_details_approved.length - 1;
    const tr  = frm.doc.floor_details_approved[idx];
    if (!tr) return;
    tr.plinth_area = tp; tr.carpet_area = tc; tr.saleable_area = ts;
    if (tr.name && locals[tr.doctype] && locals[tr.doctype][tr.name]) {
        locals[tr.doctype][tr.name].plinth_area   = tp;
        locals[tr.doctype][tr.name].carpet_area   = tc;
        locals[tr.doctype][tr.name].saleable_area = ts;
    }
    setTimeout(() => {
        const g = frm.fields_dict.floor_details_approved && frm.fields_dict.floor_details_approved.grid;
        if (!g) return;
        const gr = g.grid_rows[idx]; if (!gr) return;
        [['plinth_area',tp],['carpet_area',tc],['saleable_area',ts]].forEach(([f,v]) => {
            const fd = gr.get_field(f); if (fd && fd.$input) fd.$input.val(v);
        });
        gr.refresh();
    }, 50);
    frm.refresh_field('floor_details_approved');
}

// =====================================================
// UPDATE PLINTH IN FLOOR AREA CALCULATION
// =====================================================
function update_floor_area_calculation_plinth_values(frm) {
    if (!frm.doc.floor_area_calculation || !frm.doc.floor_area_calculation.length) return;
    const am = {}, apm = {};
    (frm.doc.floor_details || []).forEach(f => {
        if (f.floor_type && f.floor_type !== 'Total in Sq.Ft') am[f.floor_type] = n(f.plinth_area);
    });
    (frm.doc.floor_details_approved || []).forEach(f => {
        if (f.floor_type && f.floor_type !== 'Total in Sq.Ft') apm[f.floor_type] = n(f.plinth_area);
    });
    frm.doc.floor_area_calculation.forEach(r => {
        if (r.floor_type === 'Total') return;
        r.as_per_approved_plan = apm[r.floor_type] || 0;
        r.as_per_actual        = am[r.floor_type]  || 0;
    });
    frm.refresh_field('floor_area_calculation');
}

// =====================================================
// GENERATE FLOOR AREA CALCULATION
// =====================================================
function generate_floor_area_calculation(frm) {
    const rates = {};
    (frm.doc.floor_area_calculation || []).forEach(r => {
        if (r.floor_type && r.floor_type !== 'Total') rates[r.floor_type] = n(r.rate);
    });
    frm.clear_table('floor_area_calculation');
    const af = (frm.doc.floor_details || [])
        .filter(f => f.floor_type && f.floor_type !== 'Total in Sq.Ft')
        .map(f => ({ floor_type: f.floor_type, plinth_area: n(f.plinth_area) }));
    const pf = (frm.doc.floor_details_approved || [])
        .filter(f => f.floor_type && f.floor_type !== 'Total in Sq.Ft')
        .map(f => ({ floor_type: f.floor_type, plinth_area: n(f.plinth_area) }));
    for (let i = 0; i < Math.max(af.length, pf.length); i++) {
        const a  = af[i] || { floor_type: '', plinth_area: 0 };
        const p  = pf[i] || { floor_type: '', plinth_area: 0 };
        const ft = p.floor_type || a.floor_type || ('Floor ' + (i + 1));
        const r  = frm.add_child('floor_area_calculation');
        r.floor_type = ft; r.as_per_approved_plan = p.plinth_area;
        r.as_per_actual = a.plinth_area; r.rate = rates[ft] || 0;
        r.total_as_per_approved_plan = 0; r.total_as_per_actual = 0;
    }
    const tr = frm.add_child('floor_area_calculation');
    tr.floor_type = 'Total'; tr.rate = pf.length;
    tr.as_per_approved_plan = 0; tr.as_per_actual = 0;
    tr.total_as_per_approved_plan = 0; tr.total_as_per_actual = 0;
    frm.refresh_field('floor_area_calculation');
}

// =====================================================
// CALCULATE FLOOR AREA TOTALS
// =====================================================
function calculate_floor_area_calculation(frm) {
    if (!frm.doc.floor_area_calculation || !frm.doc.floor_area_calculation.length) return;
    const nfa = (frm.doc.floor_details_approved || [])
        .filter(f => f.floor_type && f.floor_type !== 'Total in Sq.Ft').length;
    let ta = 0, tac = 0;
    frm.doc.floor_area_calculation.forEach(r => {
        if (r.floor_type === 'Total') return;
        r.total_as_per_approved_plan = n(r.as_per_approved_plan) * n(r.rate);
        r.total_as_per_actual        = n(r.as_per_actual)        * n(r.rate);
        ta += r.total_as_per_approved_plan; tac += r.total_as_per_actual;
    });
    const lr = frm.doc.floor_area_calculation[frm.doc.floor_area_calculation.length - 1];
    if (lr && lr.floor_type === 'Total') {
        lr.rate = nfa; lr.total_as_per_approved_plan = ta; lr.total_as_per_actual = tac;
    }
    frm.refresh_field('floor_area_calculation');
}

// =====================================================
// MAKE TOTAL ROW READ-ONLY
// =====================================================
function make_total_row_readonly(frm, fn) {
    if (!frm.doc[fn] || !frm.doc[fn].length) return;
    const idx = frm.doc[fn].length - 1;
    setTimeout(() => {
        const g = frm.fields_dict[fn] && frm.fields_dict[fn].grid;
        if (!g) return;
        const gr = g.grid_rows[idx]; if (!gr) return;
        ['floor_type','plinth_area','carpet_area','saleable_area','remarks'].forEach(f => {
            const fd = gr.get_field(f);
            if (fd && fd.$input) fd.$input.prop('disabled', true).css(
                {'background-color':'#f8f9fa','cursor':'not-allowed','opacity':'0.6'});
        });
    }, 200);
}

/* =====================================================
   MASTER PIPELINE
===================================================== */
function recalculate_all(frm) {
    // Step 1: Calculate guideline and market values (tron, dr_d)
    calculate_guideline_market(frm);
    
    // Step 2: Calculate amenities table values (this sets net_cost values too)
    calculate_amenities_table_values(frm);
    
    // Step 3: Get values from amenities table and update summary fields
    calculate_amenities_and_totals(frm);
    
    // Step 4: Calculate deviations
    calculate_deviations(frm);
}

// =====================================================
// GUIDELINE & MARKET
// =====================================================
function calculate_guideline_market(frm) {
    frm.doc.tron = n(frm.doc.as_per_guideline_value) * n(frm.doc.rate_for_sft);
    frm.doc.dr_d = n(frm.doc.as_per_market_rate)     * n(frm.doc.mr_rate_for_sft);
    frm.doc.realisable_value_for_market_land_rate        = n(frm.doc.dr_d) * 0.9;
    frm.doc.forced_distressed_value_for_market_land_rate = n(frm.doc.dr_d) * 0.8;
    ['tron','dr_d','realisable_value_for_market_land_rate',
     'forced_distressed_value_for_market_land_rate'].forEach(f => frm.refresh_field(f));
}

// =====================================================
// AMENITIES & TOTALS
// =====================================================
function calculate_amenities_and_totals(frm) {
    // Get values from amenities table (already calculated by calculate_amenities_table_values)
    const totalGuideLineAP = get_amenity_value(frm, 'Total Guide Line Value', 'total_as_per_approved_plan');
    const totalGuideLineAA = get_amenity_value(frm, 'Total Guide Line Value', 'total_as_per_actual');
    
    const totalFairMarketAP = get_amenity_value(frm, 'Total Fair Market Value', 'total_as_per_approved_plan');
    const totalFairMarketAA = get_amenity_value(frm, 'Total Fair Market Value', 'total_as_per_actual');
    
    const realizableAP = get_amenity_value(frm, 'Realizable Value 90%', 'total_as_per_approved_plan');
    const realizableAA = get_amenity_value(frm, 'Realizable Value 90%', 'total_as_per_actual');
    
    const forcedAP = get_amenity_value(frm, 'Forced Distressed Value 80%', 'total_as_per_approved_plan');
    const forcedAA = get_amenity_value(frm, 'Forced Distressed Value 80%', 'total_as_per_actual');
    
    // Update summary values from table
    frm.doc.uoyt_glr_value = String(n(totalGuideLineAP));
    frm.doc.glr_value = String(n(totalGuideLineAA));
    frm.doc.iuyt_market_value = String(n(totalFairMarketAP));
    frm.doc.fair_market = String(n(totalFairMarketAA));
    frm.doc.uyt_realisable_value = String(n(realizableAP));
    frm.doc.realisable_value = String(n(realizableAA));
    frm.doc.iutyre_distress_sale_value = String(n(forcedAP));
    frm.doc.ip_distress_sale_value = String(n(forcedAA));
    
    // Get net_cost values from floor_area_calculation
    let fa = 0, fa2 = 0;
    const tr = (frm.doc.floor_area_calculation || []).find(r => r.floor_type === 'Total');
    if (tr) { fa = n(tr.total_as_per_approved_plan); fa2 = n(tr.total_as_per_actual); }
    frm.doc.net_cost_after_depreciation = fa;
    frm.doc.net_cost_after_depreciation_1 = fa2; 
    
    ['uoyt_glr_value','glr_value','iuyt_market_value','fair_market','uyt_realisable_value',
     'realisable_value','iutyre_distress_sale_value','ip_distress_sale_value',
     'net_cost_after_depreciation','net_cost_after_depreciation_1'].forEach(f => frm.refresh_field(f));
}

// =====================================================
// DEVIATIONS (pure client-side, no server call)
// =====================================================
function calculate_deviations(frm) {
    const nf  = Math.max(parseInt(frm.doc.number_of_floors)         || 1, 1);
    const nfa = Math.max(parseInt(frm.doc.number_of_floors_approved) || 1, 1);
    const sa  = parseFloat(frm.doc.scaleable_area) || 0;

    // Vertical deviation: (actual_floors / approved_floors * 100) - 100
    const vertical = parseFloat((((nf / nfa) * 100) - 100).toFixed(2));

    // Ground floor plinth areas
    let actual_ground = 0, approved_ground = 0;

    (frm.doc.floor_details || []).forEach(f => {
        if ((f.floor_type || '').trim().toLowerCase() === 'ground floor')
            actual_ground = parseFloat(f.plinth_area) || 0;
    });

    (frm.doc.floor_details_approved || []).forEach(f => {
        if ((f.floor_type || '').trim().toLowerCase() === 'ground floor')
            approved_ground = parseFloat(f.plinth_area) || 0;
    });

    // Horizontal deviation: ((actual_ground - approved_ground) / scaleable_area) * 100
    const horizontal = sa > 0
        ? Math.round(((actual_ground - approved_ground) / sa) * 100)
        : 0;

    frm.set_value('vertical_deviation',   vertical);
    frm.set_value('horizontal_deviation', horizontal);
}

// =====================================================
// SUMMARY - Now handled by calculate_amenities_and_totals
// =====================================================
// calculate_summary function is no longer needed as all values
// are now properly calculated in calculate_amenities_table_values
// and retrieved in calculate_amenities_and_totals

// End of file


