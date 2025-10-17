# reports/fields.py

# --- ADDED MISSING LISTS ---
# These lists define the common fields used in the admin panel.
COMMON_FIELDS = [ 'company_name', 'address_1', 'address_2', 'address_3', 'address_4', 'region', 'country', 'geographical_coverage', 'phone_number', 'company_email', 'website', 'accreditation', 'parent_company' ]
CONTACT_FIELDS = [ 'title_1', 'initials_1', 'surname_1', 'position_1', 'title_2', 'initials_2', 'surname_2', 'position_2', 'title_3', 'initials_3', 'surname_3', 'position_3', 'title_4', 'initials_4', 'surname_4', 'position_4' ]
# --- END OF ADDITION ---


# This file contains the definitive, ordered lists of filter tags for each category.
INJECTION_FIELDS = [ 'custom', 'proprietary_products', 'in_house', 'ps', 'san', 'abs', 'ldpe', 'lldpe', 'hdpe', 'pp', 'pom', 'pa', 'pa12', 'pa11', 'pa66', 'pa6', 'pmma', 'pc', 'ppo', 'peek', 'pet', 'pbt', 'psu', 'pvc', 'tpes', 'tpes_type', 'thermosets', 'bioresins', 'other_materials', 'main_materials', 'polymer_range_number', 'polymer_range', 'automotive', 'automotive_under_the_bonnet', 'automotive_interior', 'automotive_exterior', 'automotive_description', 'electrical', 'electrical_components', 'appliances', 'telectronics', 'electrical_description', 'houseware', 'housewares_non_electrical', 'pet_accessories', 'houseware_description', 'medical', 'medical_devices', 'medical_containers', 'medical_description', 'packaging', 'crates_boxes', 'preform', 'pails', 'thin_wall_food_packaging', 'cosmetics_packaging', 'caps_closures', 'lids', 'cartons_caps', 'aerosol_overcaps', 'pumps', 'push_on_caps', 'screwcaps', 'packaging_description', 'building', 'horticulture_agriculture', 'sport_leisure', 'toys', 'dvd_cds', 'pipe_fittings', 'personal_care', 'furniture', 'other_products', 'main_applications', 'clean_room', 'tool_design', 'tool_manufacture', 'pad_printing', 'hot_foil_stamping', 'insert_moulding', 'painting', 'inmould_labelling', 'electroplating_metalizing', 'twin_multi_shot_moulding', 'gas_water_assisted_moulding', 'three_d_printing', 'other_services', 'minimal_lock_tonnes', 'maximum_lock_tonnes', 'minimum_shot_grammes', 'maximum_shot_grammes', 'number_of_machines', 'machinery_brand']
BLOW_FIELDS = ['in_house', 'custom', 'proprietary_products', 'hdpe', 'ldpe', 'lldpe', 'pet', 'apet', 'petg', 'cpet', 'pp', 'pvc', 'pc', 'other_materials', 'main_materials', 'polymer_range_number', 'polymer_range', 'under_1_litre', 'from_1_to_5_litres', 'from_5_to_25_litres', 'from_25_to_220_litres', 'over_220_litres', 'auto_fuel_tanks', 'automotive', 'cosmetics_packaging', 'food_drink', 'household_chemicals', 'industrial_chemicals', 'medical', 'technical_moulding', 'toys', 'tubes', 'other_products', 'main_applications', 'multilayer', 'clean_room', 'tool_design', 'tool_manufacture', 'product_development', 'just_in_time', 'assembly', 'filling', 'labelling', 'welding', 'embossing', 'pad_printing', 'silk_screen_printing', 'offset_printing', 'other_printing', 'printing', 'number_of_colours', 'design', 'other_services', 'extrusion_blow_moulding_machines', 'injection_blow_moulding_machines', 'injection_stretch_blow_moulding_stage_1_machines', 'injection_stretch_blow_moulding_stage_2_machines', 'buy_in_preform', 'buy_in_preform_percentage', 'number_of_machines', 'machinery_brand']
ROTO_FIELDS = ['custom', 'in_house', 'proprietary_products', 'ldpe', 'lldpe', 'xlpe', 'hdpe', 'eva', 'pvc', 'pa', 'pc', 'lldpe_c4', 'lldpe_c6', 'lldpe_c8', 'other_materials', 'main_materials', 'polymer_range_number', 'polymer_range', 'horticulture_agriculture', 'marine_fishing', 'toys', 'sport_leisure', 'road_furniture', 'footballs', 'automotive_vehicles_trucks', 'ibcs', 'boats_canoes_kayaks', 'heating_oil_diesel_tanks', 'chemical_un_tanks', 'septic_tanks', 'water_tank_other_tanks', 'waste_container_bottle_banks', 'underground_fittings', 'pos_mannequins_displays', 'materials_handling_boxes', 'materials_handling_pallets', 'other_products', 'main_applications', 'printing', 'tool_design', 'tool_manufacture', 'product_development', 'design', 'other_services', 'minimum_size', 'maximum_size', 'number_of_machines']
PE_FILM_FIELDS = ['ldpe', 'lldpe', 'lldpe_c4', 'lldpe_c6', 'lldpe_c8', 'mlldpe', 'hdpe', 'eva', 'eaa_eba', 'ionomer', 'pa', 'pp', 'pvc', 'bioresins', 'other_materials', 'main_materials', 'polymer_range_number', 'polymer_range', 'minimum_width_mm', 'maximum_width_mm', 'multilayer', 'number_of_layers', 'cast_lines', 'blown_lines', 'machinery_brand', 'film_on_reel', 'agricultural_film', 'agricultural_silage', 'agricultural_mulch', 'agricultural_greenhouse', 'shrink_fill_collation', 'shrink_film_pallet', 'stretch_film', 'stretch_hood', 'building_film', 'hygiene_film', 'laminating_film', 'freezer_film', 'other_films', 'carrier_bags', 'biodegradable_bags', 'other_bags', 'industrial_sacks', 'refuse_sacks', 'other_sacks', 'other_products', 'main_applications', 'product_lamination', 'printing', 'flexo_printing', 'gravure_printing', 'number_of_colours', 'other_services']
SHEET_FIELDS = ['custom', 'in_house', 'proprietary_products', 'ps', 'abs', 'pp', 'ldpe', 'lldpe', 'hdpe', 'pmma', 'pc', 'pvc', 'pet', 'petg', 'uhmwpe', 'recycled_materials', 'pla', 'other_bioresins', 'other_materials', 'main_materials', 'polymer_range_number', 'polymer_range', 'compound_in_house', 'buy_in_compounds', 'minimum_gauge_mm', 'maximum_gauge_mm', 'minimum_width_mm', 'maximum_width_mm', 'flame_retardant_sheet', 'embossed_sheet', 'coated_sheet', 'laminated_sheet', 'foamed_sheet', 'corrugated_sheet', 'profiled_sheet', 'coextruded_sheet', 'number_of_layers', 'plain_sheet', 'cross_linked_sheet', 'other_type_of_sheet', 'extrusion_process', 'number_of_extrusion_lines', 'coextrusion_process', 'number_of_coextrusion_lines', 'calendering_process', 'number_of_calendering_lines', 'pressing_process', 'number_of_pressed_lines', 'liquid_cell_casting', 'number_of_lcc_line', 'in_line_process', 'glazing', 'lighting', 'membrane', 'insulation', 'flooring', 'construction_other', 'display', 'pannelling', 'automotive', 'aerospace', 'appliances', 'sport_leisure', 'stationery_supplies', 'other_industrial_markets', 'chilled_food', 'fast_food', 'meat_fish', 'yellow_fats', 'frozen_food', 'bakery_confectionary', 'ovenable', 'fruit_vegetable', 'ambient_food', 'cups', 'retail_pos_packaging', 'medical', 'protective_packaging', 'other_food_packaging', 'non_food_packaging', 'other_products', 'main_applications']
PIPE_FIELDS = ['below_ground_pressure', 'below_ground_non_pressure', 'above_ground_pressure', 'above_ground_non_pressure', 'other_pipes', 'water_supply_distribution', 'gas_transmission_distribution', 'drainage_sewerage', 'storm_water_drainage', 'road_railways_drainage', 'agricultural_drainage', 'cable_protection', 'internal_soil_waste_sewerage', 'internal_hot_cold_plumbing_heating', 'roof_gutter_systems', 'irrigation', 'air_conditioning', 'other_products', 'main_applications', 'up_to_32_mm', 'between_33_63_mm', 'between_64_90_mm', 'between_91_109_mm', 'between_110_160_mm', 'between_161_250_mm', 'between_251_400_mm', 'between_401_500_mm', 'between_501_630_mm', 'between_631_1000_mm', 'between_1001_1200_mm', 'over_1200_mm', 'lldpe', 'ldpe', 'hdpe', 'mdpe', 'xlpe', 'pe80', 'pe100', 'pert', 'pvc', 'pvcc', 'polybutylene', 'pp', 'abs', 'pa', 'modified_pvc', 'pp_r', 'oriented_pvc', 'pe100rc', 'other_materials', 'main_materials', 'polymer_range_number', 'polymer_range', 'coextruded_foam_core', 'twin_wall', 'multilayer_polymeric', 'multilayer_polymer_metal', 'reinforced_wall', 'solid_wall', 'other_technologies', 'number_of_machines']
TUBE_HOSE_FIELDS = ['custom', 'in_house', 'proprietary_products', 'pvc', 'rigid_pvc', 'flexible_pvc', 'ldpe', 'hdpe', 'lldpe', 'pp', 'ps', 'pom', 'pa', 'abs', 'tpes', 'tpe_e', 'sebs', 'tpu', 'tpv', 'pmma', 'pc', 'pbt', 'other_materials', 'main_materials', 'polymer_range_number', 'polymer_range', 'compound_in_house', 'buy_in_compounds', 'automotive', 'medical', 'food_drink', 'horticulture_agriculture', 'electrical_conduit', 'other_products', 'main_applications', 'hydraulic', 'pneumatic', 'flexible', 'rigid_shapes', 'monolayer', 'multilayer', 'extrusion_foam', 'corrugated_extrusion', 'twin_wall', 'bi_colour', 'other_technologies', 'machinery_brand', 'number_of_machines', 'minimum_diameter_mm', 'maximum_diameter_mm', 'clean_room', 'tool_design', 'just_in_time', 'high_frequency_welding', 'ultrasonic_welding', 'other_welding', 'pad_printing', 'silk_screen_printing', 'hot_foil_stamping', 'other_printing', 'assembly', 'machining', 'recycling', 'other_services']
PROFILE_FIELDS = ['custom', 'in_house', 'proprietary_products', 'pvc', 'rigid_pvc', 'flexible_pvc', 'ldpe', 'hdpe', 'lldpe', 'pp', 'ps', 'pom', 'pa', 'abs', 'tpes', 'tpe_e', 'sebs', 'tpu', 'tpv', 'pmma', 'pc', 'pbt', 'wpc', 'other_materials', 'main_materials', 'compound_in_house', 'buy_in_compounds', 'polymer_range_number', 'polymer_range', 'door', 'window', 'seals_gaskets', 'soffits_bargeboard_compact', 'soffits_bargeboard_foamed', 'cladding', 'shutters', 'furniture', 'lighting', 'blinds', 'trunking', 'floor_panels', 'decking', 'other_products', 'main_applications', 'monolayer', 'multilayer', 'extrusion_foam', 'corrugated_extrusion', 'twin_wall', 'bi_colour', 'other_technologies', 'machinery_brand', 'number_of_machines', 'minimum_diameter_mm', 'maximum_diameter_mm', 'clean_room', 'tool_design', 'just_in_time', 'high_frequency_welding', 'ultrasonic_welding', 'other_welding', 'pad_printing', 'silk_screen_printing', 'hot_foil_stamping', 'other_printing', 'assembly', 'machining', 'recycling', 'other_services']
CABLE_FIELDS = ['pvc', 'ldpe', 'cellular_pe', 'hdpe_mdpe', 'xlpe', 'pp', 'tpes', 'elastomers', 'lldpe', 'lsf0h', 'pbt', 'silicone', 'fluoropolymers', 'cpe', 'cspe', 'epr', 'epdm', 'eva', 'other_materials', 'main_materials', 'polymer_range_number', 'polymer_range', 'low_voltage_1k_insulation', 'medium_voltage_1_36k_insulation', 'high_voltage_36k_insulation', 'metallic_insulation', 'optical_insulation', 'automotive_insulation', 'mining_insulation', 'data_cable_insulation', 'computer_cable_insulation', 'microphone_cable_insulation', 'plenum_insulation', 'low_voltage_1k_jacketing', 'medium_voltage_1_36k_jacketing', 'high_voltage_36k_jacketing', 'metallic_jacketing', 'optical_jacketing', 'automotive_jacketing', 'mining_jacketing', 'microphone_cable_jacketing', 'computer_cable_jacketing', 'data_cable_jacketing', 'plenum_jacketing', 'other_products', 'main_applications', 'number_of_machines']
COMPOUNDER_FIELDS = ['lldpe', 'ldpe', 'hdpe', 'ps', 'pp', 'rigid_pvc', 'flexible_pvc', 'pa', 'pc', 'abs', 'san', 'pet', 'acetal', 'pbt', 'tpes', 'other_materials', 'main_materials', 'reprocessing', 'colour_compounds', 'flame_retardant_compounds', 'mineral_filled_compounds', 'glass_filled_compounds', 'elastomer_modified_compounds', 'cross_linked_compounds', 'carbon_fibre_compounds', 'natural_fibre_compounds', 'other_compounds', 'compounds_percentage', 'compounds_applications', 'black_masterbatch', 'white_masterbatch', 'colour_masterbatch', 'additive_masterbatch', 'liquid_masterbatch', 'other_masterbatches', 'masterbatch_percentage', 'masterbatches_applications', 'main_applications', 'number_of_machines', 'twin_screw_extruders', 'single_screw_extruders', 'batch_mixers', 'polymer_producer', 'production_volume_number', 'polymer_range']
ALL_COMMONS = list(dict.fromkeys(INJECTION_FIELDS + BLOW_FIELDS + ROTO_FIELDS + PE_FILM_FIELDS + SHEET_FIELDS + PIPE_FIELDS + TUBE_HOSE_FIELDS + PROFILE_FIELDS + CABLE_FIELDS + COMPOUNDER_FIELDS))


MODAL_CONTACT_FIELDS = [
    'company_name', 'address_1', 'address_2', 'address_3', 'address_4',
    'region', 'country', 'geographical_coverage', 'phone_number',
    'company_email', 'website', 'accreditation', 'parent_company',
    'title_1', 'initials_1', 'surname_1', 'position_1',
    'title_2', 'initials_2', 'surname_2', 'position_2',
    'title_3', 'initials_3', 'surname_3', 'position_3',
    'title_4', 'initials_4', 'surname_4', 'position_4',
]

MODAL_POLYMER_FIELDS = [
    'main_materials', 'polymer_range', 'ps', 'san', 'abs', 'ldpe', 'lldpe',
    'hdpe', 'pp', 'pom', 'pa', 'pa12', 'pa11', 'pa66', 'pa6', 'pmma', 'pc',
    'ppo', 'peek', 'pet', 'pbt', 'psu', 'pvc', 'tpes', 'tpes_type', 'thermosets',
    'bioresins', 'other_bioresins', 'apet', 'petg', 'cpet', 'xlpe', 'eva',
    'lldpe_c4', 'lldpe_c6', 'lldpe_c8', 'mlldpe', 'eaa_eba', 'ionomer', 'uhmwpe',
    'recycled_materials', 'pla', 'mdpe', 'pe80', 'pe100', 'pert', 'pvcc',
    'polybutylene', 'modified_pvc', 'pp_r', 'oriented_pvc', 'pe100rc',
    'rigid_pvc', 'flexible_pvc', 'tpe_e', 'sebs', 'tpu', 'tpv', 'wpc',
    'cellular_pe', 'hdpe_mdpe', 'elastomers', 'lsf0h', 'silicone', 'fluoropolymers',
    'cpe', 'cspe', 'epr', 'epdm', 'acetal', 'reprocessing', 'colour_compounds',
    'flame_retardant_compounds', 'mineral_filled_compounds', 'glass_filled_compounds',
    'elastomer_modified_compounds', 'cross_linked_compounds', 'carbon_fibre_compounds',
    'natural_fibre_compounds', 'black_masterbatch', 'white_masterbatch',
    'colour_masterbatch', 'additive_masterbatch', 'liquid_masterbatch',
]

MODAL_MARKET_FIELDS = [
    'automotive', 'automotive_under_the_bonnet', 'automotive_interior', 'automotive_exterior',
    'automotive_vehicles_trucks', 'auto_fuel_tanks', 'electrical', 'electrical_components',
    'appliances', 'telectronics', 'houseware', 'housewares_non_electrical', 'pet_accessories',
    'medical', 'medical_devices', 'medical_containers', 'packaging', 'crates_boxes', 'preform',
    'pails', 'thin_wall_food_packaging', 'cosmetics_packaging', 'caps_closures', 'lids',
    'cartons_caps', 'aerosol_overcaps', 'pumps', 'push_on_caps', 'screwcaps', 'building',
    'horticulture_agriculture', 'sport_leisure', 'toys', 'dvd_cds', 'pipe_fittings',
    'personal_care', 'furniture', 'food_drink', 'household_chemicals', 'industrial_chemicals',
    'technical_moulding', 'tubes', 'marine_fishing', 'road_furniture', 'footballs', 'ibcs',
    'boats_canoes_kayaks', 'heating_oil_diesel_tanks', 'chemical_un_tanks', 'septic_tanks',
    'water_tank_other_tanks', 'waste_container_bottle_banks', 'underground_fittings',
    'pos_mannequins_displays', 'materials_handling_boxes', 'materials_handling_pallets',
    'film_on_reel', 'agricultural_film', 'shrink_film_pallet', 'stretch_film', 'building_film',
    'hygiene_film', 'laminating_film', 'freezer_film', 'carrier_bags', 'industrial_sacks',
    'glazing', 'lighting', 'membrane', 'insulation', 'flooring', 'display', 'pannelling',
    'aerospace', 'stationery_supplies', 'chilled_food', 'fast_food', 'ovenable', 'cups',
    'below_ground_pressure', 'water_supply_distribution', 'cable_protection', 'irrigation',
    'electrical_conduit', 'hydraulic', 'pneumatic', 'door', 'window', 'seals_gaskets',
    'cladding', 'shutters', 'blinds', 'trunking', 'floor_panels', 'decking',
    'low_voltage_1k_insulation', 'automotive_insulation', 'mining_insulation',
]

MODAL_MACHINERY_FIELDS = [
    'minimal_lock_tonnes', 'maximum_lock_tonnes', 'minimum_shot_grammes', 'maximum_shot_grammes',
    'number_of_machines', 'machinery_brand', 'extrusion_blow_moulding_machines',
    'injection_blow_moulding_machines', 'injection_stretch_blow_moulding_stage_1_machines',
    'injection_stretch_blow_moulding_stage_2_machines', 'minimum_size', 'maximum_size',
    'minimum_width_mm', 'maximum_width_mm', 'minimum_gauge_mm', 'maximum_gauge_mm',
    'minimum_diameter_mm', 'maximum_diameter_mm', 'twin_screw_extruders',
    'single_screw_extruders', 'batch_mixers',
]

MODAL_SERVICES_FIELDS = [
    'tool_design', 'tool_manufacture', 'pad_printing', 'hot_foil_stamping',
    'insert_moulding', 'painting', 'inmould_labelling', 'electroplating_metalizing',
    'twin_multi_shot_moulding', 'gas_water_assisted_moulding', 'three_d_printing',
    'clean_room', 'product_development', 'just_in_time', 'assembly', 'filling',
    'labelling', 'welding', 'embossing', 'silk_screen_printing', 'offset_printing',
    'printing', 'design', 'high_frequency_welding', 'ultrasonic_welding',
    'other_welding', 'machining', 'recycling', 'other_services'
]