// Enhanced Professional RecordDetailModal.jsx based on fields.py
// File: frontend/src/components/database/RecordDetailModal.jsx

import { useMemo } from 'react';
import { X, ExternalLink, Phone, MapPin, Building2, User, Factory, Award, Wrench, CheckCircle, MinusCircle, Beaker, Target, Package } from 'lucide-react';
import { useRecordDetail } from '../../hooks/useDatabase';
import LoadingSpinner from '../LoadingSpinner';

// --- FIELD LISTS (Mirrored from fields.py for determining which fields are relevant to a category) ---
const COMMON_FIELDS = ['company_name', 'address_1', 'address_2', 'address_3', 'address_4', 'region', 'country', 'geographical_coverage', 'phone_number', 'company_email', 'website', 'accreditation', 'parent_company'];
const CONTACT_FIELDS = ['title_1', 'initials_1', 'surname_1', 'position_1', 'title_2', 'initials_2', 'surname_2', 'position_2', 'title_3', 'initials_3', 'surname_3', 'position_3', 'title_4', 'initials_4', 'surname_4', 'position_4'];
const INJECTION_FIELDS = [ 'custom', 'proprietary_products', 'in_house', 'ps', 'san', 'abs', 'ldpe', 'lldpe', 'hdpe', 'pp', 'pom', 'pa', 'pa12', 'pa11', 'pa66', 'pa6', 'pmma', 'pc', 'ppo', 'peek', 'pet', 'pbt', 'psu', 'pvc', 'tpes', 'tpes_type', 'thermosets', 'bioresins', 'other_materials', 'main_materials', 'polymer_range_number', 'polymer_range', 'automotive', 'automotive_under_the_bonnet', 'automotive_interior', 'automotive_exterior', 'automotive_description', 'electrical', 'electrical_components', 'appliances', 'telectronics', 'electrical_description', 'houseware', 'housewares_non_electrical', 'pet_accessories', 'houseware_description', 'medical', 'medical_devices', 'medical_containers', 'medical_description', 'packaging', 'crates_boxes', 'preform', 'pails', 'thin_wall_food_packaging', 'cosmetics_packaging', 'caps_closures', 'lids', 'cartons_caps', 'aerosol_overcaps', 'pumps', 'push_on_caps', 'screwcaps', 'packaging_description', 'building', 'horticulture_agriculture', 'sport_leisure', 'toys', 'dvd_cds', 'pipe_fittings', 'personal_care', 'furniture', 'other_products', 'main_applications', 'clean_room', 'tool_design', 'tool_manufacture', 'pad_printing', 'hot_foil_stamping', 'insert_moulding', 'painting', 'inmould_labelling', 'electroplating_metalizing', 'twin_multi_shot_moulding', 'gas_water_assisted_moulding', 'three_d_printing', 'other_services', 'minimal_lock_tonnes', 'maximum_lock_tonnes', 'minimum_shot_grammes', 'maximum_shot_grammes', 'number_of_machines', 'machinery_brand'];
const BLOW_FIELDS = ['in_house', 'custom', 'proprietary_products', 'hdpe', 'ldpe', 'lldpe', 'pet', 'apet', 'petg', 'cpet', 'pp', 'pvc', 'pc', 'other_materials', 'main_materials', 'polymer_range_number', 'polymer_range', 'under_1_litre', 'from_1_to_5_litres', 'from_5_to_25_litres', 'from_25_to_220_litres', 'over_220_litres', 'auto_fuel_tanks', 'automotive', 'cosmetics_packaging', 'food_drink', 'household_chemicals', 'industrial_chemicals', 'medical', 'technical_moulding', 'toys', 'tubes', 'other_products', 'main_applications', 'multilayer', 'clean_room', 'tool_design', 'tool_manufacture', 'product_development', 'just_in_time', 'assembly', 'filling', 'labelling', 'welding', 'embossing', 'pad_printing', 'silk_screen_printing', 'offset_printing', 'other_printing', 'printing', 'number_of_colours', 'design', 'other_services', 'extrusion_blow_moulding_machines', 'injection_blow_moulding_machines', 'injection_stretch_blow_moulding_stage_1_machines', 'injection_stretch_blow_moulding_stage_2_machines', 'buy_in_preform', 'buy_in_preform_percentage', 'number_of_machines', 'machinery_brand'];
const ROTO_FIELDS = ['custom', 'in_house', 'proprietary_products', 'ldpe', 'lldpe', 'xlpe', 'hdpe', 'eva', 'pvc', 'pa', 'pc', 'lldpe_c4', 'lldpe_c6', 'lldpe_c8', 'other_materials', 'main_materials', 'polymer_range_number', 'polymer_range', 'horticulture_agriculture', 'marine_fishing', 'toys', 'sport_leisure', 'road_furniture', 'footballs', 'automotive_vehicles_trucks', 'ibcs', 'boats_canoes_kayaks', 'heating_oil_diesel_tanks', 'chemical_un_tanks', 'septic_tanks', 'water_tank_other_tanks', 'waste_container_bottle_banks', 'underground_fittings', 'pos_mannequins_displays', 'materials_handling_boxes', 'materials_handling_pallets', 'other_products', 'main_applications', 'printing', 'tool_design', 'tool_manufacture', 'product_development', 'design', 'other_services', 'minimum_size', 'maximum_size', 'number_of_machines'];
const PE_FILM_FIELDS = ['ldpe', 'lldpe', 'lldpe_c4', 'lldpe_c6', 'lldpe_c8', 'mlldpe', 'hdpe', 'eva', 'eaa_eba', 'ionomer', 'pa', 'pp', 'pvc', 'bioresins', 'other_materials', 'main_materials', 'polymer_range_number', 'polymer_range', 'minimum_width_mm', 'maximum_width_mm', 'multilayer', 'number_of_layers', 'cast_lines', 'blown_lines', 'machinery_brand', 'film_on_reel', 'agricultural_film', 'agricultural_silage', 'agricultural_mulch', 'agricultural_greenhouse', 'shrink_fill_collation', 'shrink_film_pallet', 'stretch_film', 'stretch_hood', 'building_film', 'hygiene_film', 'laminating_film', 'freezer_film', 'other_films', 'carrier_bags', 'biodegradable_bags', 'other_bags', 'industrial_sacks', 'refuse_sacks', 'other_sacks', 'other_products', 'main_applications', 'product_lamination', 'printing', 'flexo_printing', 'gravure_printing', 'number_of_colours', 'other_services'];
const SHEET_FIELDS = ['custom', 'in_house', 'proprietary_products', 'ps', 'abs', 'pp', 'ldpe', 'lldpe', 'hdpe', 'pmma', 'pc', 'pvc', 'pet', 'petg', 'uhmwpe', 'recycled_materials', 'pla', 'other_bioresins', 'other_materials', 'main_materials', 'polymer_range_number', 'polymer_range', 'compound_in_house', 'buy_in_compounds', 'minimum_gauge_mm', 'maximum_gauge_mm', 'minimum_width_mm', 'maximum_width_mm', 'flame_retardant_sheet', 'embossed_sheet', 'coated_sheet', 'laminated_sheet', 'foamed_sheet', 'corrugated_sheet', 'profiled_sheet', 'coextruded_sheet', 'number_of_layers', 'plain_sheet', 'cross_linked_sheet', 'other_type_of_sheet', 'extrusion_process', 'number_of_extrusion_lines', 'coextrusion_process', 'number_of_coextrusion_lines', 'calendering_process', 'number_of_calendering_lines', 'pressing_process', 'number_of_pressed_lines', 'liquid_cell_casting', 'number_of_lcc_line', 'in_line_process', 'glazing', 'lighting', 'membrane', 'insulation', 'flooring', 'construction_other', 'display', 'pannelling', 'automotive', 'aerospace', 'appliances', 'sport_leisure', 'stationery_supplies', 'other_industrial_markets', 'chilled_food', 'fast_food', 'meat_fish', 'yellow_fats', 'frozen_food', 'bakery_confectionary', 'ovenable', 'fruit_vegetable', 'ambient_food', 'cups', 'retail_pos_packaging', 'medical', 'protective_packaging', 'other_food_packaging', 'non_food_packaging', 'other_products', 'main_applications'];
const PIPE_FIELDS = ['below_ground_pressure', 'below_ground_non_pressure', 'above_ground_pressure', 'above_ground_non_pressure', 'other_pipes', 'water_supply_distribution', 'gas_transmission_distribution', 'drainage_sewerage', 'storm_water_drainage', 'road_railways_drainage', 'agricultural_drainage', 'cable_protection', 'internal_soil_waste_sewerage', 'internal_hot_cold_plumbing_heating', 'roof_gutter_systems', 'irrigation', 'air_conditioning', 'other_products', 'main_applications', 'up_to_32_mm', 'between_33_63_mm', 'between_64_90_mm', 'between_91_109_mm', 'between_110_160_mm', 'between_161_250_mm', 'between_251_400_mm', 'between_401_500_mm', 'between_501_630_mm', 'between_631_1000_mm', 'between_1001_1200_mm', 'over_1200_mm', 'lldpe', 'ldpe', 'hdpe', 'mdpe', 'xlpe', 'pe80', 'pe100', 'pert', 'pvc', 'pvcc', 'polybutylene', 'pp', 'abs', 'pa', 'modified_pvc', 'pp_r', 'oriented_pvc', 'pe100rc', 'other_materials', 'main_materials', 'polymer_range_number', 'polymer_range', 'coextruded_foam_core', 'twin_wall', 'multilayer_polymeric', 'multilayer_polymer_metal', 'reinforced_wall', 'solid_wall', 'other_technologies', 'number_of_machines'];
const TUBE_HOSE_FIELDS = ['custom', 'in_house', 'proprietary_products', 'pvc', 'rigid_pvc', 'flexible_pvc', 'ldpe', 'hdpe', 'lldpe', 'pp', 'ps', 'pom', 'pa', 'abs', 'tpes', 'tpe_e', 'sebs', 'tpu', 'tpv', 'pmma', 'pc', 'pbt', 'other_materials', 'main_materials', 'polymer_range_number', 'polymer_range', 'compound_in_house', 'buy_in_compounds', 'automotive', 'medical', 'food_drink', 'horticulture_agriculture', 'electrical_conduit', 'other_products', 'main_applications', 'hydraulic', 'pneumatic', 'flexible', 'rigid_shapes', 'monolayer', 'multilayer', 'extrusion_foam', 'corrugated_extrusion', 'twin_wall', 'bi_colour', 'other_technologies', 'machinery_brand', 'number_of_machines', 'minimum_diameter_mm', 'maximum_diameter_mm', 'clean_room', 'tool_design', 'just_in_time', 'high_frequency_welding', 'ultrasonic_welding', 'other_welding', 'pad_printing', 'silk_screen_printing', 'hot_foil_stamping', 'other_printing', 'assembly', 'machining', 'recycling', 'other_services'];
const PROFILE_FIELDS = ['custom', 'in_house', 'proprietary_products', 'pvc', 'rigid_pvc', 'flexible_pvc', 'ldpe', 'hdpe', 'lldpe', 'pp', 'ps', 'pom', 'pa', 'abs', 'tpes', 'tpe_e', 'sebs', 'tpu', 'tpv', 'pmma', 'pc', 'pbt', 'wpc', 'other_materials', 'main_materials', 'compound_in_house', 'buy_in_compounds', 'polymer_range_number', 'polymer_range', 'door', 'window', 'seals_gaskets', 'soffits_bargeboard_compact', 'soffits_bargeboard_foamed', 'cladding', 'shutters', 'furniture', 'lighting', 'blinds', 'trunking', 'floor_panels', 'decking', 'other_products', 'main_applications', 'monolayer', 'multilayer', 'extrusion_foam', 'corrugated_extrusion', 'twin_wall', 'bi_colour', 'other_technologies', 'machinery_brand', 'number_of_machines', 'minimum_diameter_mm', 'maximum_diameter_mm', 'clean_room', 'tool_design', 'just_in_time', 'high_frequency_welding', 'ultrasonic_welding', 'other_welding', 'pad_printing', 'silk_screen_printing', 'hot_foil_stamping', 'other_printing', 'assembly', 'machining', 'recycling', 'other_services'];
const CABLE_FIELDS = ['pvc', 'ldpe', 'cellular_pe', 'hdpe_mdpe', 'xlpe', 'pp', 'tpes', 'elastomers', 'lldpe', 'lsf0h', 'pbt', 'silicone', 'fluoropolymers', 'cpe', 'cspe', 'epr', 'epdm', 'eva', 'other_materials', 'main_materials', 'polymer_range_number', 'polymer_range', 'low_voltage_1k_insulation', 'medium_voltage_1_36k_insulation', 'high_voltage_36k_insulation', 'metallic_insulation', 'optical_insulation', 'automotive_insulation', 'mining_insulation', 'data_cable_insulation', 'computer_cable_insulation', 'microphone_cable_insulation', 'plenum_insulation', 'low_voltage_1k_jacketing', 'medium_voltage_1_36k_jacketing', 'high_voltage_36k_jacketing', 'metallic_jacketing', 'optical_jacketing', 'automotive_jacketing', 'mining_jacketing', 'microphone_cable_jacketing', 'computer_cable_jacketing', 'data_cable_jacketing', 'plenum_jacketing', 'other_products', 'main_applications', 'number_of_machines'];
const COMPOUNDER_FIELDS = ['lldpe', 'ldpe', 'hdpe', 'ps', 'pp', 'rigid_pvc', 'flexible_pvc', 'pa', 'pc', 'abs', 'san', 'pet', 'acetal', 'pbt', 'tpes', 'other_materials', 'main_materials', 'reprocessing', 'colour_compounds', 'flame_retardant_compounds', 'mineral_filled_compounds', 'glass_filled_compounds', 'elastomer_modified_compounds', 'cross_linked_compounds', 'carbon_fibre_compounds', 'natural_fibre_compounds', 'other_compounds', 'compounds_percentage', 'compounds_applications', 'black_masterbatch', 'white_masterbatch', 'colour_masterbatch', 'additive_masterbatch', 'liquid_masterbatch', 'other_masterbatches', 'masterbatch_percentage', 'masterbatches_applications', 'main_applications', 'number_of_machines', 'twin_screw_extruders', 'single_screw_extruders', 'batch_mixers', 'polymer_producer', 'production_volume_number', 'polymer_range'];
// Add other category field lists (ROTO_FIELDS, PE_FILM_FIELDS, etc.) here for completeness...

// --- SUBCATEGORY DEFINITIONS ---
const MATERIALS_POLYMERS_SET = new Set(['main_materials', 'polymer_range', 'ps', 'san', 'abs', 'ldpe', 'lldpe', 'hdpe', 'pp', 'pom', 'pa', 'pa12', 'pa11', 'pa66', 'pa6', 'pmma', 'pc', 'ppo', 'peek', 'pet', 'pbt', 'psu', 'pvc', 'tpes', 'tpes_type', 'thermosets', 'bioresins', 'other_bioresins', 'apet', 'petg', 'cpet', 'xlpe', 'eva', 'lldpe_c4', 'lldpe_c6', 'lldpe_c8', 'mlldpe', 'eaa_eba', 'ionomer', 'uhmwpe', 'recycled_materials', 'pla', 'mdpe', 'pe80', 'pe100', 'pert', 'pvcc', 'polybutylene', 'modified_pvc', 'pp_r', 'oriented_pvc', 'pe100rc', 'rigid_pvc', 'flexible_pvc', 'tpe_e', 'sebs', 'tpu', 'tpv', 'wpc', 'cellular_pe', 'hdpe_mdpe', 'elastomers', 'lsf0h', 'silicone', 'fluoropolymers', 'cpe', 'cspe', 'epr', 'epdm', 'acetal', 'reprocessing', 'colour_compounds', 'flame_retardant_compounds', 'mineral_filled_compounds', 'glass_filled_compounds', 'elastomer_modified_compounds', 'cross_linked_compounds', 'carbon_fibre_compounds', 'natural_fibre_compounds', 'other_compounds', 'black_masterbatch', 'white_masterbatch', 'colour_masterbatch', 'additive_masterbatch', 'liquid_masterbatch', 'other_masterbatches', 'other_materials']);
const APPLICATIONS_MARKETS_SET = new Set(['main_applications', 'automotive_description', 'electrical_description', 'houseware_description', 'medical_description', 'packaging_description', 'other_products', 'automotive', 'automotive_under_the_bonnet', 'automotive_interior', 'automotive_exterior', 'automotive_vehicles_trucks', 'auto_fuel_tanks', 'electrical', 'electrical_components', 'appliances', 'telectronics', 'houseware', 'housewares_non_electrical', 'pet_accessories', 'medical', 'medical_devices', 'medical_containers', 'packaging', 'crates_boxes', 'preform', 'pails', 'thin_wall_food_packaging', 'cosmetics_packaging', 'caps_closures', 'lids', 'cartons_caps', 'aerosol_overcaps', 'pumps', 'push_on_caps', 'screwcaps', 'building', 'horticulture_agriculture', 'sport_leisure', 'toys', 'dvd_cds', 'pipe_fittings', 'personal_care', 'furniture', 'food_drink', 'household_chemicals', 'industrial_chemicals', 'technical_moulding', 'tubes', 'marine_fishing', 'road_furniture', 'footballs', 'ibcs', 'boats_canoes_kayaks', 'heating_oil_diesel_tanks', 'chemical_un_tanks', 'septic_tanks', 'water_tank_other_tanks', 'waste_container_bottle_banks', 'underground_fittings', 'pos_mannequins_displays', 'materials_handling_boxes', 'materials_handling_pallets', 'film_on_reel', 'agricultural_film', 'shrink_film_pallet', 'stretch_film', 'building_film', 'hygiene_film', 'laminating_film', 'freezer_film', 'carrier_bags', 'industrial_sacks', 'glazing', 'lighting', 'membrane', 'insulation', 'flooring', 'display', 'pannelling', 'aerospace', 'stationery_supplies', 'chilled_food', 'fast_food', 'ovenable', 'cups', 'below_ground_pressure', 'water_supply_distribution', 'cable_protection', 'irrigation', 'electrical_conduit', 'hydraulic', 'pneumatic', 'door', 'window', 'seals_gaskets', 'cladding', 'shutters', 'blinds', 'trunking', 'floor_panels', 'decking', 'low_voltage_1k_insulation', 'automotive_insulation', 'mining_insulation']);
const SERVICES_CAPABILITIES_SET = new Set(['custom', 'proprietary_products', 'in_house', 'other_services', 'tool_design', 'tool_manufacture', 'pad_printing', 'hot_foil_stamping', 'insert_moulding', 'painting', 'inmould_labelling', 'electroplating_metalizing', 'twin_multi_shot_moulding', 'gas_water_assisted_moulding', 'three_d_printing', 'clean_room', 'product_development', 'just_in_time', 'assembly', 'filling', 'labelling', 'welding', 'embossing', 'silk_screen_printing', 'offset_printing', 'printing', 'design', 'high_frequency_welding', 'ultrasonic_welding', 'other_welding', 'machining', 'recycling', 'product_lamination', 'flexo_printing', 'gravure_printing']);
const TECHNICAL_SPECIFICATIONS_SET = new Set(['polymer_range_number', 'minimal_lock_tonnes', 'maximum_lock_tonnes', 'minimum_shot_grammes', 'maximum_shot_grammes', 'number_of_machines', 'machinery_brand', 'extrusion_blow_moulding_machines', 'injection_blow_moulding_machines', 'injection_stretch_blow_moulding_stage_1_machines', 'injection_stretch_blow_moulding_stage_2_machines', 'minimum_size', 'maximum_size', 'minimum_width_mm', 'maximum_width_mm', 'minimum_gauge_mm', 'maximum_gauge_mm', 'minimum_diameter_mm', 'maximum_diameter_mm', 'twin_screw_extruders', 'single_screw_extruders', 'batch_mixers', 'under_1_litre', 'from_1_to_5_litres', 'from_5_to_25_litres', 'from_25_to_220_litres', 'over_220_litres', 'buy_in_preform', 'buy_in_preform_percentage', 'number_of_colours', 'multilayer', 'number_of_layers', 'cast_lines', 'blown_lines', 'compound_in_house', 'buy_in_compounds', 'flame_retardant_sheet', 'embossed_sheet', 'coated_sheet', 'laminated_sheet', 'foamed_sheet', 'corrugated_sheet', 'profiled_sheet', 'coextruded_sheet', 'plain_sheet', 'cross_linked_sheet', 'other_type_of_sheet', 'extrusion_process', 'number_of_extrusion_lines', 'coextrusion_process', 'number_of_coextrusion_lines', 'calendering_process', 'number_of_calendering_lines', 'pressing_process', 'number_of_pressed_lines', 'liquid_cell_casting', 'number_of_lcc_line', 'in_line_process']);
const COMPANY_INFO_SET = new Set(['company_name', 'address_1', 'address_2', 'address_3', 'address_4', 'region', 'country', 'geographical_coverage', 'parent_company', 'accreditation']);
const CONTACT_INFO_SET = new Set(['phone_number', 'company_email', 'website']);


// Map category slugs to their respective field arrays
const CATEGORY_FIELDS_MAP = {
  INJECTION: INJECTION_FIELDS,
  BLOW: BLOW_FIELDS,
  ROTO: ROTO_FIELDS,
  PE_FILM: PE_FILM_FIELDS,
  SHEET: SHEET_FIELDS,
  PIPE: PIPE_FIELDS,
  TUBE_HOSE: TUBE_HOSE_FIELDS,
  PROFILE: PROFILE_FIELDS,
  CABLE: CABLE_FIELDS,
  COMPOUNDER: COMPOUNDER_FIELDS,
};

const RecordDetailModal = ({ factoryId, onClose, isGuest }) => {
  const { data: record, isLoading } = useRecordDetail(factoryId);

  const hasValue = (value) => value !== null && value !== undefined && value !== '' && value !== 'N/A';

  const categorizedFields = useMemo(() => {
    // Guard clause: Wait for the API data, especially our custom `detailed_fields` array.
    if (!record?.detailed_fields) {
      return {};
    }

    // STEP 1: Determine the full list of RELEVANT field keys for this record's specific category.
    const categorySpecificFields = CATEGORY_FIELDS_MAP[record.category] || [];
    const allRelevantFieldKeys = new Set([
      ...COMMON_FIELDS,
      ...CONTACT_FIELDS,
      ...categorySpecificFields
    ]);

    // STEP 2: Filter the rich data from the API (`detailed_fields`) to include ONLY the fields
    // that are relevant (from Step 1) AND have a value.
    const availableFields = record.detailed_fields.filter(field =>
      hasValue(field.value) && allRelevantFieldKeys.has(field.key)
    );

    // STEP 3: Group the filtered, available fields into their final subcategories for display.
    const groups = {
      companyInfo: [],
      contactInfo: [],
      materials: [],
      markets: [],
      services: [],
      technical: [],
    };

    availableFields.forEach(field => {
      // `field` is now an object like { key, label, value }
      if (COMPANY_INFO_SET.has(field.key)) groups.companyInfo.push(field);
      else if (CONTACT_INFO_SET.has(field.key)) groups.contactInfo.push(field);
      else if (MATERIALS_POLYMERS_SET.has(field.key)) groups.materials.push(field);
      else if (APPLICATIONS_MARKETS_SET.has(field.key)) groups.markets.push(field);
      else if (SERVICES_CAPABILITIES_SET.has(field.key)) groups.services.push(field);
      else if (TECHNICAL_SPECIFICATIONS_SET.has(field.key)) groups.technical.push(field);
    });

    return groups;
  }, [record]);


  if (!factoryId) return null;

  const renderField = (label, value) => {
    // Guest check for sensitive data is handled in the contactInfo section and render block
    if (typeof value === 'boolean') {
      return (<div className="py-2 px-3 flex items-center justify-between hover:bg-white/50 rounded-lg transition-colors border-b border-gray-200"><dt className="text-sm text-gray-800 font-medium">{label}</dt><dd>{value ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <MinusCircle className="w-5 h-5 text-red-500" />}</dd></div>);
    }

    const displayValue = isGuest && typeof value === 'string' ? '████████' : value;
    return (<div className="py-2 px-3 hover:bg-white/50 rounded-lg transition-colors"><dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">{label}</dt><dd className="text-sm text-gray-900 font-medium">{displayValue}</dd></div>);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white px-8 py-6 flex-shrink-0">
            <div className="flex items-start justify-between"><div className="flex-1"><div className="flex items-center gap-3 mb-2"><div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center"><Factory className="w-7 h-7 text-white" /></div><div><h2 className="text-2xl font-bold">{isGuest ? 'Company Details (Limited Access)' : record?.company_name || 'Company Details'}</h2>{record?.category && (<div className="flex items-center gap-2 mt-1"><span className="bg-white/20 backdrop-blur-xl px-3 py-1 rounded-lg text-sm font-semibold">{record.get_category_display || record.category}</span>{record.country && <span className="text-white/90 text-sm flex items-center gap-1"><MapPin className="w-4 h-4" />{record.country}</span>}</div>)}</div></div></div><button onClick={onClose} className="flex-shrink-0 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-all"><X className="w-6 h-6" /></button></div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1">
          {isLoading ? (<div className="flex items-center justify-center py-16"><LoadingSpinner /></div>) : (
            <div className="p-8 space-y-6">
              {isGuest && (<div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl p-5"><div className="flex items-start gap-3"><div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center"><Award className="w-5 h-5 text-amber-600" /></div><div><h4 className="font-semibold text-amber-900 mb-1">Limited Preview Access</h4><p className="text-sm text-amber-800">Contact information is hidden. Upgrade to view full details.</p></div></div></div>)}

              {/* Company Information */}
              {categorizedFields.companyInfo?.length > 0 && (<div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-6 border-2 border-gray-200"><h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2 pb-3 border-b-2 border-gray-300"><Building2 className="w-6 h-6 text-indigo-600" /> Company Information</h3><div className="grid md:grid-cols-2 gap-x-6 gap-y-2">{categorizedFields.companyInfo.map(({ label, value }, i) => <div key={i}>{renderField(label, value)}</div>)}</div></div>)}

              {/* Contact Information */}
              {!isGuest && categorizedFields.contactInfo?.length > 0 && (<div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border-2 border-blue-200"><h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2 pb-3 border-b-2 border-blue-300"><Phone className="w-6 h-6 text-blue-600" /> Contact Information</h3><div className="grid md:grid-cols-2 gap-x-6 gap-y-2">{categorizedFields.contactInfo.map(({ key, label, value }, i) => (key === 'website' ? <div key={i} className="py-2 px-3 hover:bg-white/50 rounded-lg transition-colors"><dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Website</dt><dd className="text-sm"><a href={String(value).startsWith('http') ? value : `https://${value}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 break-all">{value}<ExternalLink className="w-4 h-4 flex-shrink-0" /></a></dd></div> : <div key={i}>{renderField(label, value)}</div>))}</div></div>)}

              {/* Contact Persons */}
              {!isGuest && (record?.surname_1 || record?.surname_2 || record?.surname_3 || record?.surname_4) && (<div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 rounded-xl p-6 border-2 border-purple-200"><h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2 pb-3 border-b-2 border-purple-300"><User className="w-6 h-6 text-purple-600" /> Contact Persons</h3><div className="grid md:grid-cols-2 gap-4">{[1, 2, 3, 4].map(num => {const surname = record?.[`surname_${num}`]; if (!surname && !record?.[`initials_${num}`]) return null; return (<div key={num} className="bg-white/70 rounded-lg p-4 border-2 border-purple-200"><div className="flex items-center gap-3"><div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0"><User className="w-6 h-6 text-purple-600" /></div><div className="flex-1 min-w-0"><p className="font-bold text-gray-900 text-base">{[record?.[`title_${num}`], record?.[`initials_${num}`], surname].filter(Boolean).join(' ')}</p>{record?.[`position_${num}`] && (<p className="text-sm text-purple-700 font-medium">{record[`position_${num}`]}</p>)}</div></div></div>);})}</div></div>)}

              {/* Materials & Polymers */}
              {categorizedFields.materials?.length > 0 && (<div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border-2 border-emerald-200"><h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2 pb-3 border-b-2 border-emerald-300"><Beaker className="w-6 h-6 text-emerald-600" /> Materials & Polymers</h3><div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-4">{categorizedFields.materials.map(({ label, value }, i) => <div key={i}>{renderField(label, value)}</div>)}</div></div>)}

              {/* Applications & Markets */}
              {categorizedFields.markets?.length > 0 && (<div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border-2 border-orange-200"><h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2 pb-3 border-b-2 border-orange-300"><Target className="w-6 h-6 text-orange-600" /> Applications & Markets</h3><div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-4">{categorizedFields.markets.map(({ label, value }, i) => <div key={i}>{renderField(label, value)}</div>)}</div></div>)}

              {/* Services & Capabilities */}
              {categorizedFields.services?.length > 0 && (<div className="bg-gradient-to-br from-cyan-50 to-sky-50 rounded-xl p-6 border-2 border-cyan-200"><h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2 pb-3 border-b-2 border-cyan-300"><Wrench className="w-6 h-6 text-cyan-600" /> Services & Capabilities</h3><div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-4">{categorizedFields.services.map(({ label, value }, i) => <div key={i}>{renderField(label, value)}</div>)}</div></div>)}

              {/* Technical Specifications */}
              {categorizedFields.technical?.length > 0 && (<div className="bg-gradient-to-br from-slate-50 to-zinc-50 rounded-xl p-6 border-2 border-slate-200"><h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2 pb-3 border-b-2 border-slate-300"><Package className="w-6 h-6 text-slate-600" /> Technical Specifications</h3><div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">{categorizedFields.technical.map(({ label, value }, i) => <div key={i}>{renderField(label, value)}</div>)}</div></div>)}

              {record?.last_updated && (<div className="text-center pt-4 border-t-2 border-gray-300"><p className="text-sm text-gray-500">Last updated: <span className="font-semibold text-gray-700">{new Date(record.last_updated).toLocaleString()}</span></p></div>)}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-100 px-8 py-5 border-t-2 border-gray-300 flex items-center justify-between flex-shrink-0"><div className="text-sm text-gray-600 flex items-center gap-2"><Factory className="w-4 h-4" />{isGuest ? 'Limited preview - upgrade for full access' : 'Complete company details'}</div><div className="flex gap-3">{isGuest && <button className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md">Upgrade Account</button>}<button onClick={onClose} className="px-6 py-2.5 bg-white border-2 border-gray-400 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-500 transition-all">Close</button></div></div>
      </div>
    </div>
  );
};

export default RecordDetailModal;