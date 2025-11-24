# reports/models.py

import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.contrib.auth import get_user_model
from decimal import Decimal
from dateutil.relativedelta import relativedelta
from django.db.models import Q

User = get_user_model()


# --- Company Category Class ---
# This class defines the 10 main categories for a company record.
class CompanyCategory(models.TextChoices):
    INJECTION = 'INJECTION', 'Injection Moulders'
    BLOW = 'BLOW', 'Blow Moulders'
    ROTO = 'ROTO', 'Roto Moulders'
    PE_FILM = 'PE_FILM', 'PE Film Extruders'
    SHEET = 'SHEET', 'Sheet Extruders'
    PIPE = 'PIPE', 'Pipe Extruders'
    TUBE_HOSE = 'TUBE_HOSE', 'Tube & Hose Extruders'
    PROFILE = 'PROFILE', 'Profile Extruders'
    CABLE = 'CABLE', 'Cable Extruders'
    COMPOUNDER = 'COMPOUNDER', 'Compounders'


# --- Superdatabase Record Class ---
class SuperdatabaseRecord(models.Model):
    # This is the unique identifier for every factory record.
    factory_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)

    # --- CORE IDENTIFICATION ---
    category = models.CharField(max_length=20, choices=CompanyCategory.choices,
                                help_text="The main category of this company.")
    company_name = models.CharField("Company Name", max_length=255)

    # --- COMMON COMPANY & CONTACT INFO ---
    address_1 = models.CharField("Address 1", max_length=255, blank=True)
    address_2 = models.CharField("Address 2", max_length=255, blank=True)
    address_3 = models.CharField("Address 3", max_length=255, blank=True)
    address_4 = models.CharField("Address 4", max_length=255, blank=True)
    region = models.CharField("Region", max_length=100, blank=True)
    country = models.CharField("Country", max_length=100, blank=True)
    geographical_coverage = models.CharField("Geographical Coverage", max_length=255, blank=True)
    phone_number = models.CharField("Phone Number", max_length=50, blank=True)
    company_email = models.EmailField("Company Email", max_length=255, blank=True)
    website = models.URLField("Website", max_length=255, blank=True)
    accreditation = models.TextField("Accreditation", blank=True)
    parent_company = models.CharField("Parent Company", max_length=255, blank=True)

    # --- CONTACT PERSONS ---
    title_1 = models.CharField("Title 1", max_length=50, blank=True)
    initials_1 = models.CharField("Initials 1", max_length=10, blank=True)
    surname_1 = models.CharField("Surname 1", max_length=100, blank=True)
    position_1 = models.CharField("Position 1", max_length=100, blank=True)
    title_2 = models.CharField("Title 2", max_length=50, blank=True)
    initials_2 = models.CharField("Initials 2", max_length=10, blank=True)
    surname_2 = models.CharField("Surname 2", max_length=100, blank=True)
    position_2 = models.CharField("Position 2", max_length=100, blank=True)
    title_3 = models.CharField("Title 3", max_length=50, blank=True)
    initials_3 = models.CharField("Initials 3", max_length=10, blank=True)
    surname_3 = models.CharField("Surname 3", max_length=100, blank=True)
    position_3 = models.CharField("Position 3", max_length=100, blank=True)
    title_4 = models.CharField("Title 4", max_length=50, blank=True)
    initials_4 = models.CharField("Initials 4", max_length=10, blank=True)
    surname_4 = models.CharField("Surname 4", max_length=100, blank=True)
    position_4 = models.CharField("Position 4", max_length=100, blank=True)

    # --- GENERAL OPERATIONS & MATERIALS ---
    custom = models.BooleanField("Custom", default=False)
    proprietary_products = models.BooleanField("Proprietary Products", default=False)
    in_house = models.BooleanField("In House", default=False)
    other_materials = models.CharField("Other Materials", max_length=255, blank=True)
    main_materials = models.CharField("Main Materials", max_length=255, blank=True)
    polymer_range_number = models.IntegerField("Polymer Range Number", null=True, blank=True)
    polymer_range = models.CharField("Polymer Range", max_length=100, blank=True)
    compound_in_house = models.BooleanField("Compound in House", default=False)
    buy_in_compounds = models.BooleanField("Buy in Compounds", default=False)

    # --- MATERIAL FLAGS (Polymers) ---
    abs = models.BooleanField("ABS", default=False)
    acetal = models.BooleanField("Acetal", default=False)
    apet = models.BooleanField("APET", default=False)
    bioresins = models.BooleanField("Bioresins", default=False)
    other_bioresins = models.CharField("Other Bioresins", max_length=255, blank=True)  # NEW
    cellular_pe = models.BooleanField("Cellular PE", default=False)
    cpe = models.BooleanField("CPE", default=False)
    cpet = models.BooleanField("CPET", default=False)
    cspe = models.BooleanField("CSPE", default=False)
    eaa_eba = models.BooleanField("EAA/EBA", default=False)
    elastomers = models.BooleanField("Elastomers", default=False)
    epdm = models.BooleanField("EPDM", default=False)
    epr = models.BooleanField("EPR", default=False)
    eva = models.BooleanField("EVA", default=False)
    flexible_pvc = models.BooleanField("Flexible PVC", default=False)
    fluoropolymers = models.BooleanField("Fluoropolymers", default=False)
    hdpe = models.BooleanField("HDPE", default=False)
    hdpe_mdpe = models.BooleanField("HDPE/MDPE", default=False)
    ionomer = models.BooleanField("Ionomer", default=False)
    ldpe = models.BooleanField("LDPE", default=False)
    lldpe = models.BooleanField("LLDPE", default=False)
    lldpe_c4 = models.BooleanField("LLDPE C4", default=False)
    lldpe_c6 = models.BooleanField("LLDPE C6", default=False)
    lldpe_c8 = models.BooleanField("LLDPE C8", default=False)
    lsf0h = models.BooleanField("LSF0H", default=False)
    mdpe = models.BooleanField("MDPE", default=False)
    mlldpe = models.BooleanField("MLLDPE", default=False)
    modified_pvc = models.BooleanField("Modified PVC", default=False)
    oriented_pvc = models.BooleanField("Oriented PVC", default=False)
    pa = models.BooleanField("PA", default=False)
    pa6 = models.BooleanField("PA6", default=False)
    pa11 = models.BooleanField("PA11", default=False)
    pa12 = models.BooleanField("PA12", default=False)
    pa66 = models.BooleanField("PA66", default=False)
    pbt = models.BooleanField("PBT", default=False)
    pc = models.BooleanField("PC", default=False)
    pe100 = models.BooleanField("PE100", default=False)
    pe100rc = models.BooleanField("PE100RC", default=False)
    pe80 = models.BooleanField("PE80", default=False)
    peek = models.BooleanField("PEEK", default=False)
    pert = models.BooleanField("PERT", default=False)
    pet = models.BooleanField("PET", default=False)
    petg = models.BooleanField("PETG", default=False)
    pla = models.BooleanField("PLA", default=False)
    pmma = models.BooleanField("PMMA", default=False)
    polybutylene = models.BooleanField("PolyButylene", default=False)
    pom = models.BooleanField("POM", default=False)
    pp = models.BooleanField("PP", default=False)
    pp_r = models.BooleanField("PP-R", default=False)
    ppo = models.BooleanField("PPO", default=False)
    ps = models.BooleanField("PS", default=False)
    psu = models.BooleanField("PSU", default=False)
    pvc = models.BooleanField("PVC", default=False)
    pvcc = models.BooleanField("PVCc", default=False)
    recycled_materials = models.BooleanField("Recycled Materials", default=False)
    rigid_pvc = models.BooleanField("Rigid PVC", default=False)
    san = models.BooleanField("SAN", default=False)
    sebs = models.BooleanField("SEBS", default=False)
    silicone = models.BooleanField("Silicone", default=False)
    thermosets = models.BooleanField("Thermosets", default=False)
    tpes = models.BooleanField("TPEs", default=False)
    tpes_type = models.CharField("TPEs Type", max_length=100, blank=True)
    tpe_e = models.BooleanField("TPE-E", default=False)
    tpu = models.BooleanField("TPU", default=False)
    tpv = models.BooleanField("TPV", default=False)
    uhmwpe = models.BooleanField("UHMWPE", default=False)
    wpc = models.BooleanField("WPC", default=False)
    xlpe = models.BooleanField("XLPE", default=False)

    # --- APPLICATION MARKETS ---
    aerosol_overcaps = models.BooleanField("Aerosol Overcaps", default=False)
    aerospace = models.BooleanField("Aerospace", default=False)
    agricultural_drainage = models.BooleanField("Agricultural Drainage", default=False)
    agricultural_film = models.BooleanField("Agricultural Film", default=False)
    agricultural_greenhouse = models.BooleanField("Agricultural Greenhouse", default=False)
    agricultural_mulch = models.BooleanField("Agricultural Mulch", default=False)
    agricultural_silage = models.BooleanField("Agricultural Silage", default=False)
    air_conditioning = models.BooleanField("Air Conditioning", default=False)
    ambient_food = models.BooleanField("Ambient Food", default=False)
    appliances = models.BooleanField("Appliances", default=False)
    auto_fuel_tanks = models.BooleanField("Auto Fuel Tanks", default=False)
    automotive = models.BooleanField("Automotive", default=False)
    automotive_exterior = models.BooleanField("Automotive/Exterior", default=False)
    automotive_insulation = models.BooleanField("Automotive-Insulation", default=False)
    automotive_interior = models.BooleanField("Automotive/Interior", default=False)
    automotive_jacketing = models.BooleanField("Automotive-Jacketing", default=False)
    automotive_under_the_bonnet = models.BooleanField("Automotive/Under the Bonnet", default=False)
    automotive_vehicles_trucks = models.BooleanField("Automotive/Vehicles/Trucks", default=False)
    bakery_confectionary = models.BooleanField("Bakery/Confectionary", default=False)
    blinds = models.BooleanField("Blinds", default=False)
    boats_canoes_kayaks = models.BooleanField("Boats/Canoes/Kayaks", default=False)
    building = models.BooleanField("Building", default=False)
    building_film = models.BooleanField("Building Film", default=False)
    cable_protection = models.BooleanField("Cable Protection", default=False)
    caps_closures = models.BooleanField("Caps/Closures", default=False)
    carrier_bags = models.BooleanField("Carrier Bags", default=False)
    cartons_caps = models.BooleanField("Cartons Caps", default=False)
    chemical_un_tanks = models.BooleanField("Chemical UN Tanks", default=False)
    chilled_food = models.BooleanField("Chilled Food", default=False)
    cladding = models.BooleanField("Cladding", default=False)
    computer_cable_insulation = models.BooleanField("Computer Cable-Insulation", default=False)
    computer_cable_jacketing = models.BooleanField("Computer Cable-Jacketing", default=False)
    cosmetics_packaging = models.BooleanField("Cosmetics Packaging", default=False)
    crates_boxes = models.BooleanField("Crates/Boxes", default=False)
    cups = models.BooleanField("Cups", default=False)
    data_cable_insulation = models.BooleanField("Data Cable-Insulation", default=False)
    data_cable_jacketing = models.BooleanField("Data Cable-Jacketing", default=False)
    decking = models.BooleanField("Decking", default=False)
    display = models.BooleanField("Display", default=False)
    door = models.BooleanField("Door", default=False)
    drainage_sewerage = models.BooleanField("Drainage Sewerage", default=False)
    dvd_cds = models.BooleanField("DVD/CDs", default=False)
    electrical = models.BooleanField("Electrical", default=False)
    electrical_components = models.BooleanField("Electrical Components", default=False)
    electrical_conduit = models.BooleanField("Electrical Conduit", default=False)
    fast_food = models.BooleanField("Fast Food", default=False)
    film_on_reel = models.BooleanField("Film on Reel", default=False)
    floor_panels = models.BooleanField("Floor Panels", default=False)
    flooring = models.BooleanField("Flooring", default=False)
    food_drink = models.BooleanField("Food/Drink", default=False)
    footballs = models.BooleanField("Footballs", default=False)
    freezer_film = models.BooleanField("Freezer Film", default=False)
    frozen_food = models.BooleanField("Frozen Food", default=False)
    fruit_vegetable = models.BooleanField("Fruit/Vegetable", default=False)
    furniture = models.BooleanField("Furniture", default=False)
    gas_transmission_distribution = models.BooleanField("Gas Transmission Distribution", default=False)
    glazing = models.BooleanField("Glazing", default=False)
    heating_oil_diesel_tanks = models.BooleanField("Heating Oil Diesel Tanks", default=False)
    high_voltage_36k_insulation = models.BooleanField("High Voltage 36K-Insulation", default=False)
    high_voltage_36k_jacketing = models.BooleanField("High Voltage 36K-Jacketing", default=False)
    horticulture_agriculture = models.BooleanField("Horticulture/Agriculture", default=False)
    household_chemicals = models.BooleanField("Household Chemicals", default=False)
    houseware = models.BooleanField("Houseware", default=False)
    housewares_non_electrical = models.BooleanField("Housewares/Non Electrical", default=False)
    hygiene_film = models.BooleanField("Hygiene Film", default=False)
    ibcs = models.BooleanField("IBCs", default=False)
    industrial_chemicals = models.BooleanField("Industrial Chemicals", default=False)
    industrial_sacks = models.BooleanField("Industrial Sacks", default=False)
    insulation = models.BooleanField("Insulation", default=False)
    internal_hot_cold_plumbing_heating = models.BooleanField("Internal Hot & Cold Plumbing Heating", default=False)
    internal_soil_waste_sewerage = models.BooleanField("Internal Soil Waste Sewerage", default=False)
    irrigation = models.BooleanField("Irrigation", default=False)
    laminating_film = models.BooleanField("Laminating Film", default=False)
    lids = models.BooleanField("Lids", default=False)
    lighting = models.BooleanField("Lighting", default=False)
    low_voltage_1k_insulation = models.BooleanField("Low Voltage 1K-Insulation", default=False)
    low_voltage_1k_jacketing = models.BooleanField("Low Voltage 1K-Jacketing", default=False)
    marine_fishing = models.BooleanField("Marine/Fishing", default=False)
    materials_handling_boxes = models.BooleanField("Materials Handling Boxes", default=False)
    materials_handling_pallets = models.BooleanField("Materials Handling Pallets", default=False)
    meat_fish = models.BooleanField("Meat/Fish", default=False)
    medical = models.BooleanField("Medical", default=False)
    medical_containers = models.BooleanField("Medical Containers", default=False)
    medical_devices = models.BooleanField("Medical Devices", default=False)
    medium_voltage_1_36k_insulation = models.BooleanField("Medium Voltage 1-36K-Insulation", default=False)
    medium_voltage_1_36k_jacketing = models.BooleanField("Medium Voltage 1-36K-Jacketing", default=False)
    membrane = models.BooleanField("Membrane", default=False)
    metallic_insulation = models.BooleanField("Metallic-Insulation", default=False)
    metallic_jacketing = models.BooleanField("Metallic-Jacketing", default=False)
    microphone_cable_insulation = models.BooleanField("Microphone Cable-Insulation", default=False)
    microphone_cable_jacketing = models.BooleanField("Microphone Cable-Jacketing", default=False)
    mining_insulation = models.BooleanField("Mining-Insulation", default=False)
    mining_jacketing = models.BooleanField("Mining-Jacketing", default=False)
    optical_insulation = models.BooleanField("Optical-Insulation", default=False)
    optical_jacketing = models.BooleanField("Optical-Jacketing", default=False)
    ovenable = models.BooleanField("Ovenable", default=False)
    packaging = models.BooleanField("Packaging", default=False)
    pails = models.BooleanField("Pails", default=False)
    pannelling = models.BooleanField("Pannelling", default=False)
    personal_care = models.BooleanField("Personal Care", default=False)
    pet_accessories = models.BooleanField("Pet Accessories", default=False)
    pipe_fittings = models.BooleanField("Pipe Fittings", default=False)
    plenum_insulation = models.BooleanField("Plenum-Insulation", default=False)
    plenum_jacketing = models.BooleanField("Plenum-Jacketing", default=False)
    pos_mannequins_displays = models.BooleanField("POS/Mannequins/Displays", default=False)
    preform = models.BooleanField("Preform", default=False)
    protective_packaging = models.BooleanField("Protective Packaging", default=False)
    pumps = models.BooleanField("Pumps", default=False)
    push_on_caps = models.BooleanField("Push-on Caps", default=False)
    refuse_sacks = models.BooleanField("Refuse Sacks", default=False)
    retail_pos_packaging = models.BooleanField("Retail/POS Packaging", default=False)
    road_furniture = models.BooleanField("Road Furniture", default=False)
    road_railways_drainage = models.BooleanField("Road Railways Drainage", default=False)
    roof_gutter_systems = models.BooleanField("Roof Gutter Systems", default=False)
    screwcaps = models.BooleanField("Screwcaps", default=False)
    seals_gaskets = models.BooleanField("Seals/Gaskets", default=False)
    septic_tanks = models.BooleanField("Septic Tanks", default=False)
    shrink_fill_collation = models.BooleanField("Shrink Fill Collation", default=False)
    shrink_film_pallet = models.BooleanField("Shrink Film Pallet", default=False)
    shutters = models.BooleanField("Shutters", default=False)
    soffits_bargeboard_compact = models.BooleanField("Soffits Bargeboard Compact", default=False)
    soffits_bargeboard_foamed = models.BooleanField("Soffits Bargeboard Foamed", default=False)
    sport_leisure = models.BooleanField("Sport/Leisure", default=False)
    stationery_supplies = models.BooleanField("Stationery Supplies", default=False)
    storm_water_drainage = models.BooleanField("Storm Water Drainage", default=False)
    stretch_film = models.BooleanField("Stretch Film", default=False)
    stretch_hood = models.BooleanField("Stretch Hood", default=False)
    technical_moulding = models.BooleanField("Technical Moulding", default=False)
    telectronics = models.BooleanField("Telectronics", default=False)
    thin_wall_food_packaging = models.BooleanField("Thin Wall Food Packaging", default=False)
    toys = models.BooleanField("Toys", default=False)
    trunking = models.BooleanField("Trunking", default=False)
    tubes = models.BooleanField("Tubes", default=False)
    underground_fittings = models.BooleanField("Underground Fittings", default=False)
    waste_container_bottle_banks = models.BooleanField("Waste Container/Bottle Banks", default=False)
    water_supply_distribution = models.BooleanField("Water Supply Distribution", default=False)
    water_tank_other_tanks = models.BooleanField("Water Tank/Other Tanks", default=False)
    window = models.BooleanField("Window", default=False)
    yellow_fats = models.BooleanField("Yellow Fats", default=False)

    # Text descriptions for application areas
    automotive_description = models.TextField("Automotive Description", blank=True)
    electrical_description = models.TextField("Electrical Description", blank=True)
    houseware_description = models.TextField("Houseware Description", blank=True)
    medical_description = models.TextField("Medical Description", blank=True)
    packaging_description = models.TextField("Packaging Description", blank=True)
    other_products = models.TextField("Other Products", blank=True)
    main_applications = models.CharField("Main Applications", max_length=255, blank=True)
    other_industrial_markets = models.CharField("Other Industrial Markets", max_length=255, blank=True)
    other_food_packaging = models.CharField("Other Food Packaging", max_length=255, blank=True)
    non_food_packaging = models.CharField("Non Food Packaging", max_length=255, blank=True)
    construction_other = models.CharField("Construction Other", max_length=255, blank=True)

    # --- SERVICES ---
    assembly = models.BooleanField("Assembly", default=False)
    clean_room = models.BooleanField("Clean Room", default=False)
    design = models.BooleanField("Design", default=False)
    electroplating_metalizing = models.BooleanField("Electroplating/Metalizing", default=False)
    embossing = models.BooleanField("Embossing", default=False)
    filling = models.BooleanField("Filling", default=False)
    gas_water_assisted_moulding = models.BooleanField("Gas Water Assisted Moulding", default=False)
    high_frequency_welding = models.BooleanField("High Frequency Welding", default=False)
    hot_foil_stamping = models.BooleanField("Hot Foil Stamping", default=False)
    inmould_labelling = models.BooleanField("Inmould Labelling", default=False)
    insert_moulding = models.BooleanField("Insert Moulding", default=False)
    just_in_time = models.BooleanField("Just in Time", default=False)
    labelling = models.BooleanField("Labelling", default=False)
    machining = models.BooleanField("Machining", default=False)
    offset_printing = models.BooleanField("Offset Printing", default=False)
    pad_printing = models.BooleanField("Pad Printing", default=False)
    painting = models.BooleanField("Painting", default=False)
    printing = models.BooleanField("Printing", default=False)
    product_development = models.BooleanField("Product Development", default=False)
    product_lamination = models.BooleanField("Product Lamination", default=False)
    recycling = models.BooleanField("Recycling", default=False)
    silk_screen_printing = models.BooleanField("Silk Screen Printing", default=False)
    tool_design = models.BooleanField("Tool Design", default=False)
    tool_manufacture = models.BooleanField("Tool Manufacture", default=False)
    twin_multi_shot_moulding = models.BooleanField("Twin Multi Shot Moulding", default=False)
    ultrasonic_welding = models.BooleanField("Ultrasonic Welding", default=False)
    welding = models.BooleanField("Welding", default=False)
    flexo_printing = models.BooleanField("Flexo Printing", default=False)
    gravure_printing = models.BooleanField("Gravure Printing", default=False)
    three_d_printing = models.BooleanField("3D Printing", default=False)
    other_printing = models.CharField("Other Printing", max_length=255, blank=True)
    other_services = models.CharField("Other Services", max_length=255, blank=True)
    other_welding = models.CharField("Other Welding", max_length=255, blank=True)

    # --- MACHINE & TECHNICAL SPECS ---
    minimal_lock_tonnes = models.IntegerField("Minimal Lock (in tonnes)", null=True, blank=True)
    maximum_lock_tonnes = models.IntegerField("Maximum Lock (in tonnes)", null=True, blank=True)
    minimum_shot_grammes = models.IntegerField("Minimum Shot (in grammes)", null=True, blank=True)
    maximum_shot_grammes = models.IntegerField("Maximum Shot (in grammes)", null=True, blank=True)
    number_of_machines = models.IntegerField("Number of Machines", null=True, blank=True)
    machinery_brand = models.CharField("Machinery Brand", max_length=255, blank=True)
    under_1_litre = models.BooleanField("Under 1 Litre", default=False)
    from_1_to_5_litres = models.BooleanField("From 1 to 5 Litres", default=False)
    from_5_to_25_litres = models.BooleanField("From 5 to 25 Litres", default=False)
    from_25_to_220_litres = models.BooleanField("From 25 to 220 Litres", default=False)
    over_220_litres = models.BooleanField("Over 220 Litres", default=False)
    multilayer = models.BooleanField("Multilayer", default=False)
    extrusion_blow_moulding_machines = models.IntegerField("Extrusion Blow Moulding Machines", null=True, blank=True)
    injection_blow_moulding_machines = models.IntegerField("Injection Blow Moulding Machines", null=True, blank=True)
    injection_stretch_blow_moulding_stage_1_machines = models.IntegerField(
        "Injection Stretch Blow Moulding Stage 1 Machines", null=True, blank=True)
    injection_stretch_blow_moulding_stage_2_machines = models.IntegerField(
        "Injection Stretch Blow Moulding Stage 2 Machines", null=True, blank=True)
    buy_in_preform = models.BooleanField("Buy in Preform", default=False)
    buy_in_preform_percentage = models.IntegerField("Buy in Preform Percentage", null=True, blank=True)
    minimum_size = models.CharField("Minimum Size", max_length=100, blank=True)
    maximum_size = models.CharField("Maximum Size", max_length=100, blank=True)
    minimum_width_mm = models.FloatField("Minimum width (in mm)", null=True, blank=True)
    maximum_width_mm = models.FloatField("Maximum width (in mm)", null=True, blank=True)
    number_of_layers = models.IntegerField("Number of Layers", null=True, blank=True)
    cast_lines = models.IntegerField("Cast Lines", null=True, blank=True)
    blown_lines = models.IntegerField("Blow Lines", null=True, blank=True)
    number_of_colours = models.IntegerField("Number of Colours", null=True, blank=True)
    other_films = models.CharField("Other Films", max_length=255, blank=True)
    biodegradable_bags = models.BooleanField("Biodegradable Bags", default=False)
    other_bags = models.BooleanField("Other Bags", default=False)
    other_sacks = models.BooleanField("Other Sacks", default=False)
    minimum_gauge_mm = models.FloatField("Minimum gauge (in mm)", null=True, blank=True)
    maximum_gauge_mm = models.FloatField("Maximum gauge (in mm)", null=True, blank=True)
    flame_retardant_sheet = models.BooleanField("Flame Retardant Sheet", default=False)
    embossed_sheet = models.BooleanField("Embossed Sheet", default=False)
    coated_sheet = models.BooleanField("Coated Sheet", default=False)
    laminated_sheet = models.BooleanField("Laminated Sheet", default=False)
    foamed_sheet = models.BooleanField("Foamed Sheet", default=False)
    corrugated_sheet = models.BooleanField("Corrugated Sheet", default=False)
    profiled_sheet = models.BooleanField("Profiled Sheet", default=False)
    coextruded_sheet = models.BooleanField("Coextruded Sheet", default=False)
    plain_sheet = models.BooleanField("Plain Sheet", default=False)
    cross_linked_sheet = models.BooleanField("Cross Linked Sheet", default=False)
    other_type_of_sheet = models.CharField("Other Type of Sheet", max_length=255, blank=True)
    extrusion_process = models.BooleanField("Extrusion Process", default=False)
    number_of_extrusion_lines = models.IntegerField("Number of Extrusion Lines", null=True, blank=True)
    coextrusion_process = models.BooleanField("Coextrusion Process", default=False)
    number_of_coextrusion_lines = models.IntegerField("Number of Coextrusion Lines", null=True, blank=True)
    calendering_process = models.BooleanField("Calendering Process", default=False)
    number_of_calendering_lines = models.IntegerField("Number of Calendering Lines", null=True, blank=True)
    pressing_process = models.BooleanField("Pressing Process", default=False)
    number_of_pressed_lines = models.IntegerField("Number of Pressed Lines", null=True, blank=True)
    liquid_cell_casting = models.BooleanField("Liquid Cell Casting", default=False)
    number_of_lcc_line = models.IntegerField("Number of LCC Line", null=True, blank=True)
    in_line_process = models.CharField("In Line Process", max_length=255, blank=True)
    below_ground_pressure = models.BooleanField("Below Ground Pressure", default=False)
    below_ground_non_pressure = models.BooleanField("Below Ground Non Pressure", default=False)
    above_ground_pressure = models.BooleanField("Above Ground Pressure", default=False)
    above_ground_non_pressure = models.BooleanField("Above Ground Non Pressure", default=False)
    other_pipes = models.CharField("Other Pipes", max_length=255, blank=True)
    up_to_32_mm = models.BooleanField("Up to 32 mm", default=False)
    between_33_63_mm = models.BooleanField("Between 33 & 63 mm", default=False)
    between_64_90_mm = models.BooleanField("Between 64 & 90 mm", default=False)
    between_91_109_mm = models.BooleanField("Between 91 & 109 mm", default=False)
    between_110_160_mm = models.BooleanField("Between 110 & 160 mm", default=False)
    between_161_250_mm = models.BooleanField("Between 161 & 250 mm", default=False)
    between_251_400_mm = models.BooleanField("Between 251 & 400 mm", default=False)
    between_401_500_mm = models.BooleanField("Between 401 & 500 mm", default=False)
    between_501_630_mm = models.BooleanField("Between 501 & 630 mm", default=False)
    between_631_1000_mm = models.BooleanField("Between 631 & 1000 mm", default=False)
    between_1001_1200_mm = models.BooleanField("Between 1001 & 1200 mm", default=False)
    over_1200_mm = models.BooleanField("Over 1200 mm", default=False)
    coextruded_foam_core = models.BooleanField("Coextruded Foam Core", default=False)
    twin_wall = models.BooleanField("Twin Wall", default=False)
    multilayer_polymeric = models.BooleanField("Multilayer Polymeric", default=False)
    multilayer_polymer_metal = models.BooleanField("Multilayer Polymer Metal", default=False)
    reinforced_wall = models.BooleanField("Reinforced Wall", default=False)
    solid_wall = models.BooleanField("Solid Wall", default=False)
    other_technologies = models.CharField("Other Technologies", max_length=255, blank=True)
    hydraulic = models.BooleanField("Hydraulic", default=False)
    pneumatic = models.BooleanField("Pneumatic", default=False)
    flexible = models.BooleanField("Flexible", default=False)
    rigid_shapes = models.BooleanField("Rigid Shapes", default=False)
    monolayer = models.BooleanField("Monolayer", default=False)
    extrusion_foam = models.BooleanField("Extrusion Foam", default=False)
    corrugated_extrusion = models.BooleanField("Corrugated Extrusion", default=False)
    bi_colour = models.BooleanField("Bi Colour", default=False)
    minimum_diameter_mm = models.IntegerField("Minimum diameter (in mm)", null=True, blank=True)
    maximum_diameter_mm = models.IntegerField("Maximum diameter (in mm)", null=True, blank=True)
    reprocessing = models.BooleanField("Reprocessing", default=False)
    colour_compounds = models.BooleanField("Colour Compounds", default=False)
    flame_retardant_compounds = models.BooleanField("Flame Retardant Compounds", default=False)
    mineral_filled_compounds = models.BooleanField("Mineral Filled Compounds", default=False)
    glass_filled_compounds = models.BooleanField("Glass Filled Compounds", default=False)
    elastomer_modified_compounds = models.BooleanField("Elastomer Modified Compounds", default=False)
    cross_linked_compounds = models.BooleanField("Cross Linked Compounds", default=False)
    carbon_fibre_compounds = models.BooleanField("Carbon Fibre Compounds", default=False)
    natural_fibre_compounds = models.BooleanField("Natural Fibre Compounds", default=False)
    other_compounds = models.CharField("Other Compounds", max_length=255, blank=True)
    compounds_percentage = models.IntegerField("Compounds Percentage", null=True, blank=True)
    compounds_applications = models.CharField("Compounds Applications", max_length=255, blank=True)
    black_masterbatch = models.BooleanField("Black Masterbatch", default=False)
    white_masterbatch = models.BooleanField("White Masterbatch", default=False)
    colour_masterbatch = models.BooleanField("Colour Masterbatch", default=False)
    additive_masterbatch = models.BooleanField("Additive Masterbatch", default=False)
    liquid_masterbatch = models.BooleanField("Liquid Masterbatch", default=False)
    other_masterbatches = models.CharField("Other Masterbatches", max_length=255, blank=True)
    masterbatch_percentage = models.IntegerField("Masterbatch Percentage", null=True, blank=True)
    masterbatches_applications = models.CharField("Masterbatch Applications", max_length=255, blank=True)
    twin_screw_extruders = models.IntegerField("Twin Screw Extruders", null=True, blank=True)
    single_screw_extruders = models.IntegerField("Single Screw Extruders", null=True, blank=True)
    batch_mixers = models.IntegerField("Batch Mixers", null=True, blank=True)
    polymer_producer = models.BooleanField("Polymer Producer", default=False)
    production_volume_number = models.IntegerField("Production Volume Number", null=True, blank=True)

    # --- METADATA ---
    date_added = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.company_name} ({self.get_category_display()})"


# --- CUSTOM REPORT MODELS ---

# --- Subscription Plan Class ---
class SubscriptionPlan(models.TextChoices):
    MONTHLY = 'MONTHLY', 'Monthly'
    ANNUAL = 'ANNUAL', 'Annual'


# --- Subscription Status Class ---
class SubscriptionStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', 'Active'
    EXPIRED = 'EXPIRED', 'Expired'
    CANCELLED = 'CANCELLED', 'Cancelled'
    PENDING = 'PENDING', 'Pending'


# --- Custom Reports Class ---
class CustomReport(models.Model):
    """
    Custom reports that can be created from the superdatabase.
    These can be sold to clients via subscriptions.
    """
    report_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    title = models.CharField(max_length=255, unique=True)
    description = models.TextField()
    filter_criteria = models.JSONField(
        help_text="JSON object with filter rules",
        default=dict
    )

    # Pricing
    monthly_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Monthly subscription price"
    )
    annual_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Annual subscription price"
    )

    # Status
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)

    # Metadata
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_reports'
    )
    created_at = models.DateTimeField(auto_now_add=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Cache the count
    record_count = models.IntegerField(default=0, editable=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    def update_record_count(self):
        """
        Calculate and update the record count based on filter criteria.
        Handles categories, countries, filter groups (with technical filters), and boolean filters.
        """
        from django.db.models import Q
        from .models import SuperdatabaseRecord

        try:
            criteria = self.filter_criteria or {}
            queryset = SuperdatabaseRecord.objects.all()

            # Handle categories
            if 'categories' in criteria:
                categories = criteria['categories']
                if isinstance(categories, list) and len(categories) > 0:
                    category_query = Q()
                    for category in categories:
                        category_query |= Q(category__iexact=category)
                    queryset = queryset.filter(category_query)
                elif isinstance(categories, str) and categories:
                    queryset = queryset.filter(category__iexact=categories)
            elif 'category' in criteria and criteria['category']:
                queryset = queryset.filter(category__iexact=criteria['category'])

            # Handle countries
            if 'country' in criteria:
                countries = criteria['country']
                if isinstance(countries, list) and len(countries) > 0:
                    queryset = queryset.filter(country__in=countries)
                elif isinstance(countries, str) and countries:
                    queryset = queryset.filter(country=countries)

            # Handle filter groups with technical filters
            if 'filter_groups' in criteria:
                filter_groups = criteria['filter_groups']
                if isinstance(filter_groups, list):
                    for group in filter_groups:
                        if not isinstance(group, dict):
                            continue

                        group_query = Q()

                        # Boolean filters
                        filters = group.get('filters', {})
                        if filters and isinstance(filters, dict):
                            for field_name, field_value in filters.items():
                                try:
                                    SuperdatabaseRecord._meta.get_field(field_name)
                                    if field_value is True:
                                        group_query |= Q(**{field_name: True})
                                    elif field_value is False:
                                        group_query |= Q(**{field_name: False}) | Q(**{f'{field_name}__isnull': True})
                                except Exception:
                                    continue

                        # Technical filters
                        technical_filters = group.get('technicalFilters', {})
                        if technical_filters and isinstance(technical_filters, dict):
                            for field_name, filter_config in technical_filters.items():
                                if not isinstance(filter_config, dict):
                                    continue

                                try:
                                    field_obj = SuperdatabaseRecord._meta.get_field(field_name)
                                    mode = filter_config.get('mode', 'range')

                                    if mode == 'equals':
                                        equals_val = filter_config.get('equals', '')
                                        if equals_val != '' and equals_val is not None:
                                            try:
                                                if field_obj.get_internal_type() == 'FloatField':
                                                    equals_val = float(equals_val)
                                                else:
                                                    equals_val = int(equals_val)
                                                group_query |= Q(**{field_name: equals_val})
                                            except (ValueError, TypeError):
                                                pass

                                    elif mode == 'range':
                                        min_val = filter_config.get('min', '')
                                        max_val = filter_config.get('max', '')
                                        range_query = Q()

                                        if min_val != '' and min_val is not None:
                                            try:
                                                if field_obj.get_internal_type() == 'FloatField':
                                                    min_val = float(min_val)
                                                else:
                                                    min_val = int(min_val)
                                                range_query &= Q(**{f'{field_name}__gte': min_val})
                                            except (ValueError, TypeError):
                                                pass

                                        if max_val != '' and max_val is not None:
                                            try:
                                                if field_obj.get_internal_type() == 'FloatField':
                                                    max_val = float(max_val)
                                                else:
                                                    max_val = int(max_val)
                                                range_query &= Q(**{f'{field_name}__lte': max_val})
                                            except (ValueError, TypeError):
                                                pass

                                        if range_query:
                                            group_query |= range_query
                                except Exception:
                                    continue

                        # Apply group query
                        if group_query:
                            queryset = queryset.filter(group_query)

            # Handle remaining boolean filters (backward compatibility)
            for field, value in criteria.items():
                if field not in ['category', 'categories', 'country', 'filter_groups'] and isinstance(value, bool):
                    try:
                        queryset = queryset.filter(**{field: value})
                    except Exception:
                        pass

            # Update count
            self.record_count = queryset.count()
            self.save(update_fields=['record_count'])
            return self.record_count

        except Exception as e:
            # Don't crash - just set to 0
            self.record_count = 0
            self.save(update_fields=['record_count'])
            return 0

    def get_filtered_records(self):
        """
        Get SuperdatabaseRecord queryset filtered by this report's criteria.
        """
        from django.db.models import Q

        queryset = SuperdatabaseRecord.objects.all()

        # Apply category filter - ONLY 'category' (singular), not 'categories'
        if 'category' in self.filter_criteria and self.filter_criteria['category']:
            queryset = queryset.filter(category__iexact=self.filter_criteria['category'])

        # Apply country filter
        if 'country' in self.filter_criteria:
            countries = self.filter_criteria['country']
            if isinstance(countries, list) and len(countries) > 0:
                queryset = queryset.filter(country__in=countries)

        # Apply boolean filters (materials, properties, etc.)
        for field, value in self.filter_criteria.items():
            if field not in ['category', 'country']:
                if isinstance(value, bool):
                    queryset = queryset.filter(**{field: value})

        return queryset


# --- Subscription Class ---
class Subscription(models.Model):
    """
    Client subscriptions to custom reports
    """
    subscription_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='subscriptions',
        null=True,
        blank=True
    )
    report = models.ForeignKey(
        CustomReport,
        on_delete=models.CASCADE,
        related_name='subscriptions',
        null=True,
        blank=True
    )

    # Subscription details
    plan = models.CharField(
        max_length=20,
        choices=SubscriptionPlan.choices,
        default=SubscriptionPlan.MONTHLY
    )
    status = models.CharField(
        max_length=20,
        choices=SubscriptionStatus.choices,
        default=SubscriptionStatus.PENDING
    )

    # Dates
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    # Payment
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ['client', 'report', 'start_date']

    def __str__(self):
        return f"{self.client.username}'s {self.plan} subscription to {self.report.title}"

    @property
    def is_active(self):
        """Check if subscription is currently active"""
        if self.status != SubscriptionStatus.ACTIVE:
            return False
        today = timezone.now().date()
        return self.start_date <= today <= self.end_date

    @property
    def days_remaining(self):
        """Calculate days remaining in subscription"""
        if not self.is_active:
            return 0
        today = timezone.now().date()
        return (self.end_date - today).days

    def renew(self, plan=None):
        """
        Renew the subscription.
        If renewed before expiry, extend from end_date.
        If renewed after expiry, start from today.
        """
        today = timezone.now().date()

        if plan:
            self.plan = plan

        # Determine the base date for extension
        # If subscription is active (end_date in future), extend from end_date.
        # If expired (end_date in past), start from today.
        base_date = self.end_date
        if not base_date or base_date < today:
            base_date = today

        # Set new end date
        if self.plan == SubscriptionPlan.MONTHLY:
            self.end_date = base_date + relativedelta(months=1)
            self.amount_paid = self.report.monthly_price if self.report else Decimal('0.00')
        else:  # ANNUAL
            self.end_date = base_date + relativedelta(years=1)
            self.amount_paid = self.report.annual_price if self.report else Decimal('0.00')

        # If subscription was expired, set start date to today
        if not self.start_date or base_date == today:
            self.start_date = today

        self.status = SubscriptionStatus.ACTIVE
        self.save()

    def cancel(self):
        """Cancel the subscription"""
        self.status = SubscriptionStatus.CANCELLED
        self.save()


# --- Widget Category Class ---
class WidgetCategory(models.TextChoices):
    OVERVIEW = 'OVERVIEW', 'Overview'
    ANALYTICS = 'ANALYTICS', 'Analytics'
    ACTIVITY = 'ACTIVITY', 'Activity'
    ALERTS = 'ALERTS', 'Alerts'
    REPORTS = 'REPORTS', 'Reports'


# --- Dashboard Widget Class ---
class DashboardWidget(models.Model):
    """
    Stores configuration for dashboard widgets.
    Each widget can be enabled/disabled and positioned.
    """
    # Widget identification
    widget_key = models.CharField(
        max_length=100,
        unique=True,
        help_text="Unique identifier for the widget (e.g., 'subscription_expiry')"
    )

    # Display information
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    icon = models.CharField(
        max_length=50,
        blank=True,
        help_text="Lucide icon name (e.g., 'TrendingUp', 'Users')"
    )

    # Widget properties
    category = models.CharField(
        max_length=20,
        choices=WidgetCategory.choices,
        default=WidgetCategory.OVERVIEW
    )

    # Widget size (grid columns it takes)
    width = models.IntegerField(
        default=1,
        help_text="Width in grid columns (1-4)"
    )
    height = models.IntegerField(
        default=1,
        help_text="Height in grid rows (1-3)"
    )

    # Status and ordering
    is_enabled = models.BooleanField(default=True)
    display_order = models.IntegerField(default=0)

    # Settings (JSON field for widget-specific configuration)
    settings = models.JSONField(
        default=dict,
        blank=True,
        help_text="Widget-specific settings as JSON"
    )

    # Permissions
    required_permission = models.CharField(
        max_length=100,
        blank=True,
        help_text="Permission required to view this widget"
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['display_order', 'title']
        verbose_name = 'Dashboard Widget'
        verbose_name_plural = 'Dashboard Widgets'

    def __str__(self):
        return f"{self.title} ({'Enabled' if self.is_enabled else 'Disabled'})"


# --- User Widget Preference Class ---
class UserWidgetPreference(models.Model):
    """
    Allows individual users to customize their dashboard.
    Optional feature for personalization.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='widget_preferences')
    widget = models.ForeignKey(DashboardWidget, on_delete=models.CASCADE)
    is_visible = models.BooleanField(default=True)
    position = models.IntegerField(default=0)

    class Meta:
        unique_together = ['user', 'widget']
        ordering = ['position']

    def __str__(self):
        return f"{self.user.username} - {self.widget.title}"


# --- Saved Search Class ---
class SavedSearch(models.Model):
    """
    Model to store saved filter combinations for clients.
    Allows clients to save and quickly reuse their frequently used searches.
    """

    # Primary key - unique identifier
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    # Link to the user who created this saved search
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='saved_searches'
    )

    # Link to the report this saved search belongs to
    report = models.ForeignKey(
        'CustomReport',
        on_delete=models.CASCADE,
        related_name='saved_searches'
    )

    # Name of the saved search
    name = models.CharField(max_length=200)

    # Optional description
    description = models.TextField(blank=True, null=True)

    # Store filter parameters as JSON
    filter_params = models.JSONField(default=dict)

    # Whether this is the default search
    is_default = models.BooleanField(default=False)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'saved_searches'
        ordering = ['-created_at']
        unique_together = ['user', 'report', 'name']
        verbose_name = 'Saved Search'
        verbose_name_plural = 'Saved Searches'
        indexes = [
            models.Index(fields=['user', 'report']),
            models.Index(fields=['is_default']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.name}"


# --- Export Template Class ---
class ExportTemplate(models.Model):
    
    """
    Model to store export templates for clients.
    Allows clients to save which columns they want to export.
    """

    # Primary key
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    # Link to user
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='export_templates'
    )

    # Link to report
    report = models.ForeignKey(
        'CustomReport',
        on_delete=models.CASCADE,
        related_name='export_templates'
    )

    # Template details
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)

    # Store selected columns as JSON array
    # Example: ["company_name", "country", "address_1", "email"]
    selected_columns = models.JSONField(default=list)

    # Whether this is the default template
    is_default = models.BooleanField(default=False)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'export_templates'
        ordering = ['-created_at']
        unique_together = ['user', 'report', 'name']
        verbose_name = 'Export Template'
        verbose_name_plural = 'Export Templates'
        indexes = [
            models.Index(fields=['user', 'report']),
            models.Index(fields=['is_default']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.name}"


# --- Project Status Class ---
class ProjectStatus(models.TextChoices):
    """Status choices for data collection projects"""
    ACTIVE = 'ACTIVE', 'Active'
    COMPLETED = 'COMPLETED', 'Completed'
    ON_HOLD = 'ON_HOLD', 'On Hold'
    CANCELLED = 'CANCELLED', 'Cancelled'


# --- Data Collection Project Class ---
class DataCollectionProject(models.Model):
    """
    Projects for organizing unverified site data collection.
    Data collectors group their work into projects.
    """
    project_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    # Project details
    project_name = models.CharField(
        max_length=255,
        help_text="E.g., 'Injection Moulders PVC - North Africa Q4 2024'"
    )
    description = models.TextField(
        blank=True,
        null=True,
        help_text="Project description and scope"
    )
    
    # Project categorization
    category = models.CharField(
        max_length=50,
        choices=[
            ('INJECTION', 'Injection Moulders'),
            ('BLOW', 'Blow Moulders'),
            ('ROTO', 'Roto Moulders'),
            ('PE_FILM', 'PE Film Extruders'),
            ('SHEET', 'Sheet Extruders'),
            ('PIPE', 'Pipe Extruders'),
            ('TUBE_HOSE', 'Tube & Hose Extruders'),
            ('PROFILE', 'Profile Extruders'),
            ('CABLE', 'Cable Extruders'),
            ('COMPOUNDER', 'Compounders'),
        ],
        help_text="Primary category for this project"
    )
    
    target_region = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Target region (e.g., 'North Africa', 'Europe', 'Asia')"
    )
    
    # Project management
    status = models.CharField(
        max_length=20,
        choices=ProjectStatus.choices,
        default=ProjectStatus.ACTIVE
    )
    
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_projects',
        help_text="Data collector who created this project"
    )

    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_projects',
        limit_choices_to={'role': 'DATA_COLLECTOR'},
        help_text="Data collector assigned to work on this project"
)  

    assigned_reviewers = models.ManyToManyField(
        User,
        related_name='assigned_review_projects',
        blank=True,
        limit_choices_to={'role__in': ['SUPERADMIN', 'STAFF_ADMIN']},
        help_text="Staff/Super admins assigned to review this project"
    )
    
    # Target and progress
    target_count = models.IntegerField(
        default=0,
        help_text="Target number of companies to collect"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Deadline
    deadline = models.DateField(
        null=True,
        blank=True,
        help_text="Target completion date"
    )
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Data Collection Project'
        verbose_name_plural = 'Data Collection Projects'
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['created_by', '-created_at']),
            models.Index(fields=['category']),
        ]
    
    def __str__(self):
        return f"{self.project_name} ({self.get_status_display()})"


    def get_total_sites(self):
        """Total number of sites - use only when not using queryset annotations"""
        return self.unverified_sites.count()

    def get_pending_sites(self):
        """Number of pending sites - use only when not using queryset annotations"""
        return self.unverified_sites.filter(verification_status='PENDING').count()

    def get_approved_sites(self):
        """Number of approved sites - use only when not using queryset annotations"""
        return self.unverified_sites.filter(verification_status='APPROVED').count()

    def get_rejected_sites(self):
        """Number of rejected sites - use only when not using queryset annotations"""
        return self.unverified_sites.filter(verification_status='REJECTED').count()

    def get_under_review_sites(self):
        """Number of sites under review - use only when not using queryset annotations"""
        return self.unverified_sites.filter(verification_status='UNDER_REVIEW').count()

    def get_needs_revision_sites(self):
        """Number of sites needing revision - use only when not using queryset annotations"""
        return self.unverified_sites.filter(verification_status='NEEDS_REVISION').count()

    def get_completion_percentage(self):
        """Calculate completion percentage - use only when not using queryset annotations"""
        if self.target_count == 0:
            return 0
        return round((self.get_total_sites() / self.target_count) * 100, 1)

    def get_approval_rate(self):
        """Calculate approval rate - use only when not using queryset annotations"""
        total = self.get_total_sites()
        if total == 0:
            return 0
        return round((self.get_approved_sites() / total) * 100, 1)


# --- Review Note Class ---
class ReviewNote(models.Model):
    """
    Notes exchanged between data collectors and reviewers during the review process.
    """
    note_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    # Related site
    site = models.ForeignKey(
        'UnverifiedSite',
        on_delete=models.CASCADE,
        related_name='review_notes',
        help_text="The unverified site this note is about"
    )
    
    # Note details
    note_text = models.TextField(
        help_text="Review note or feedback"
    )
    
    # Note metadata
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_review_notes',
        help_text="User who created this note"
    )
    
    is_internal = models.BooleanField(
        default=False,
        help_text="Internal staff notes (not visible to data collectors)"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Attachments (optional - for future enhancement)
    attachment = models.FileField(
        upload_to='review_notes/',
        null=True,
        blank=True,
        help_text="Optional attachment"
    )
    
    class Meta:
        ordering = ['created_at']
        verbose_name = 'Review Note'
        verbose_name_plural = 'Review Notes'
        indexes = [
            models.Index(fields=['site', 'created_at']),
            models.Index(fields=['created_by', '-created_at']),
        ]
    
    def __str__(self):
        return f"Note by {self.created_by} on {self.site.company_name} at {self.created_at}"    
    

# --- Project Activity Log Class ---
class ProjectActivityLog(models.Model):
    """
    Activity log for tracking project-level actions.
    """
    log_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    project = models.ForeignKey(
        DataCollectionProject,
        on_delete=models.CASCADE,
        related_name='activity_logs'
    )
    
    action = models.CharField(
        max_length=100,
        choices=[
            ('CREATED', 'Project Created'),
            ('UPDATED', 'Project Updated'),
            ('SITE_ADDED', 'Site Added'),
            ('SITE_REMOVED', 'Site Removed'),
            ('BULK_APPROVED', 'Bulk Approved'),
            ('BULK_REJECTED', 'Bulk Rejected'),
            ('BULK_TRANSFERRED', 'Bulk Transferred'),
            ('REVIEWER_ASSIGNED', 'Reviewer Assigned'),
            ('STATUS_CHANGED', 'Status Changed'),
            ('COMPLETED', 'Project Completed'),
        ]
    )
    
    performed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='project_activities'
    )
    
    description = models.TextField(
        blank=True,
        null=True,
        help_text="Additional details about the action"
    )
    
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Project Activity Log'
        verbose_name_plural = 'Project Activity Logs'
        indexes = [
            models.Index(fields=['project', '-timestamp']),
            models.Index(fields=['performed_by', '-timestamp']),
        ]
    
    def __str__(self):
        return f"{self.get_action_display()} - {self.project.project_name} by {self.performed_by}"    


# --- Verification Status Class ---
class VerificationStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending Review'
    UNDER_REVIEW = 'UNDER_REVIEW', 'Under Review'
    NEEDS_REVISION = 'NEEDS_REVISION', 'Needs Revision'
    APPROVED = 'APPROVED', 'Approved'
    REJECTED = 'REJECTED', 'Rejected'
    TRANSFERRED = 'TRANSFERRED', 'Transferred to Superdatabase'


# --- Data Source Class ---
class DataSource(models.TextChoices):
    PHONE_CALL = 'PHONE_CALL', 'Phone Call'
    EMAIL = 'EMAIL', 'Email'
    WEB_RESEARCH = 'WEB_RESEARCH', 'Web Research'
    TRADE_SHOW = 'TRADE_SHOW', 'Trade Show'
    REFERRAL = 'REFERRAL', 'Referral'
    USER_INPUT = 'USER_INPUT', 'User Input'  # ADD THIS NEW ONE
    OTHER = 'OTHER', 'Other'


# --- Priority Level Class ---
class PriorityLevel(models.TextChoices):
    LOW = 'LOW', 'Low'
    MEDIUM = 'MEDIUM', 'Medium'
    HIGH = 'HIGH', 'High'
    URGENT = 'URGENT', 'Urgent'
  

# --- Verification Action Class ---
class VerificationAction(models.TextChoices):
    CREATED = 'CREATED', 'Created'
    REVIEWED = 'REVIEWED', 'Reviewed'
    APPROVED = 'APPROVED', 'Approved'
    REJECTED = 'REJECTED', 'Rejected'
    MODIFIED = 'MODIFIED', 'Modified'
    ASSIGNED = 'ASSIGNED', 'Assigned'
    TRANSFERRED = 'TRANSFERRED', 'Transferred to Superdatabase'
    COMMENT_ADDED = 'COMMENT_ADDED', 'Comment Added'
    NEEDS_REVISION = 'NEEDS_REVISION', 'Needs Revision' 
    UNDER_REVIEW = 'UNDER_REVIEW', 'Under Review'


# --- Calling Status Class ---
class CallingStatus(models.TextChoices):
    """Status choices for calling workflow"""
    NOT_STARTED = 'NOT_STARTED', 'Not Started'
    YELLOW = 'YELLOW', 'Needs Alternative Numbers'  # Creates notification for admin
    RED = 'RED', 'Not Relevant / Never Picked Up'
    PURPLE = 'PURPLE', 'Language Barrier'
    BLUE = 'BLUE', 'Call Back Later'
    GREEN = 'GREEN', 'Complete - Ready for Review'  


# --- Calling Status History Class ---
class CallingStatusHistory(models.Model):
    """Track history of calling status changes"""
    
    history_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    site = models.ForeignKey('UnverifiedSite', on_delete=models.CASCADE, related_name='status_history')
    
    # Status change details
    old_status = models.CharField(max_length=20)
    new_status = models.CharField(max_length=20)
    status_notes = models.TextField(blank=True, help_text='Notes about why status was changed')
    
    # Who made the change
    changed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='status_history_changes'  # ← FIXED!
    )
    
    # When
    changed_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-changed_at']  # Most recent first
        verbose_name = 'Calling Status History'
        verbose_name_plural = 'Calling Status Histories'
    
    def __str__(self):
        return f"{self.site.company_name}: {self.old_status} → {self.new_status}"
    
    @property
    def formatted_timestamp(self):
        """Return formatted timestamp"""
        return self.changed_at.strftime('%B %d, %Y at %I:%M %p')


# --- Unverified Site Class ---
class UnverifiedSite(models.Model):
    """
    Temporary storage for unverified company data.
    After verification, data is transferred to SuperdatabaseRecord.
    """
    
    # Primary key
    site_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, primary_key=True)
    
    # --- CORE IDENTIFICATION ---
    category = models.CharField(max_length=20, choices=CompanyCategory.choices,
                                help_text="The main category of this company.")
    company_name = models.CharField("Company Name", max_length=255)

    # --- COMMON COMPANY & CONTACT INFO ---
    address_1 = models.CharField("Address 1", max_length=255, blank=True)
    address_2 = models.CharField("Address 2", max_length=255, blank=True)
    address_3 = models.CharField("Address 3", max_length=255, blank=True)
    address_4 = models.CharField("Address 4", max_length=255, blank=True)
    region = models.CharField("Region", max_length=100, blank=True)
    country = models.CharField("Country", max_length=100, blank=True)
    geographical_coverage = models.CharField("Geographical Coverage", max_length=255, blank=True)
    phone_number = models.CharField("Phone Number", max_length=50, blank=True)
    company_email = models.EmailField("Company Email", max_length=255, blank=True)
    website = models.URLField("Website", max_length=255, blank=True)
    accreditation = models.TextField("Accreditation", blank=True)
    parent_company = models.CharField("Parent Company", max_length=255, blank=True)

    # --- CONTACT PERSONS ---
    title_1 = models.CharField("Title 1", max_length=50, blank=True)
    initials_1 = models.CharField("Initials 1", max_length=10, blank=True)
    surname_1 = models.CharField("Surname 1", max_length=100, blank=True)
    position_1 = models.CharField("Position 1", max_length=100, blank=True)
    title_2 = models.CharField("Title 2", max_length=50, blank=True)
    initials_2 = models.CharField("Initials 2", max_length=10, blank=True)
    surname_2 = models.CharField("Surname 2", max_length=100, blank=True)
    position_2 = models.CharField("Position 2", max_length=100, blank=True)
    title_3 = models.CharField("Title 3", max_length=50, blank=True)
    initials_3 = models.CharField("Initials 3", max_length=10, blank=True)
    surname_3 = models.CharField("Surname 3", max_length=100, blank=True)
    position_3 = models.CharField("Position 3", max_length=100, blank=True)
    title_4 = models.CharField("Title 4", max_length=50, blank=True)
    initials_4 = models.CharField("Initials 4", max_length=10, blank=True)
    surname_4 = models.CharField("Surname 4", max_length=100, blank=True)
    position_4 = models.CharField("Position 4", max_length=100, blank=True)

    # --- GENERAL OPERATIONS & MATERIALS ---
    custom = models.BooleanField("Custom", default=False)
    proprietary_products = models.BooleanField("Proprietary Products", default=False)
    in_house = models.BooleanField("In House", default=False)
    other_materials = models.CharField("Other Materials", max_length=255, blank=True)
    main_materials = models.CharField("Main Materials", max_length=255, blank=True)
    polymer_range_number = models.IntegerField("Polymer Range Number", null=True, blank=True)
    polymer_range = models.CharField("Polymer Range", max_length=100, blank=True)
    compound_in_house = models.BooleanField("Compound in House", default=False)
    buy_in_compounds = models.BooleanField("Buy in Compounds", default=False)

    # --- MATERIAL FLAGS (Polymers) ---
    abs = models.BooleanField("ABS", default=False)
    acetal = models.BooleanField("Acetal", default=False)
    apet = models.BooleanField("APET", default=False)
    bioresins = models.BooleanField("Bioresins", default=False)
    other_bioresins = models.CharField("Other Bioresins", max_length=255, blank=True)  # NEW
    cellular_pe = models.BooleanField("Cellular PE", default=False)
    cpe = models.BooleanField("CPE", default=False)
    cpet = models.BooleanField("CPET", default=False)
    cspe = models.BooleanField("CSPE", default=False)
    eaa_eba = models.BooleanField("EAA/EBA", default=False)
    elastomers = models.BooleanField("Elastomers", default=False)
    epdm = models.BooleanField("EPDM", default=False)
    epr = models.BooleanField("EPR", default=False)
    eva = models.BooleanField("EVA", default=False)
    flexible_pvc = models.BooleanField("Flexible PVC", default=False)
    fluoropolymers = models.BooleanField("Fluoropolymers", default=False)
    hdpe = models.BooleanField("HDPE", default=False)
    hdpe_mdpe = models.BooleanField("HDPE/MDPE", default=False)
    ionomer = models.BooleanField("Ionomer", default=False)
    ldpe = models.BooleanField("LDPE", default=False)
    lldpe = models.BooleanField("LLDPE", default=False)
    lldpe_c4 = models.BooleanField("LLDPE C4", default=False)
    lldpe_c6 = models.BooleanField("LLDPE C6", default=False)
    lldpe_c8 = models.BooleanField("LLDPE C8", default=False)
    lsf0h = models.BooleanField("LSF0H", default=False)
    mdpe = models.BooleanField("MDPE", default=False)
    mlldpe = models.BooleanField("MLLDPE", default=False)
    modified_pvc = models.BooleanField("Modified PVC", default=False)
    oriented_pvc = models.BooleanField("Oriented PVC", default=False)
    pa = models.BooleanField("PA", default=False)
    pa6 = models.BooleanField("PA6", default=False)
    pa11 = models.BooleanField("PA11", default=False)
    pa12 = models.BooleanField("PA12", default=False)
    pa66 = models.BooleanField("PA66", default=False)
    pbt = models.BooleanField("PBT", default=False)
    pc = models.BooleanField("PC", default=False)
    pe100 = models.BooleanField("PE100", default=False)
    pe100rc = models.BooleanField("PE100RC", default=False)
    pe80 = models.BooleanField("PE80", default=False)
    peek = models.BooleanField("PEEK", default=False)
    pert = models.BooleanField("PERT", default=False)
    pet = models.BooleanField("PET", default=False)
    petg = models.BooleanField("PETG", default=False)
    pla = models.BooleanField("PLA", default=False)
    pmma = models.BooleanField("PMMA", default=False)
    polybutylene = models.BooleanField("PolyButylene", default=False)
    pom = models.BooleanField("POM", default=False)
    pp = models.BooleanField("PP", default=False)
    pp_r = models.BooleanField("PP-R", default=False)
    ppo = models.BooleanField("PPO", default=False)
    ps = models.BooleanField("PS", default=False)
    psu = models.BooleanField("PSU", default=False)
    pvc = models.BooleanField("PVC", default=False)
    pvcc = models.BooleanField("PVCc", default=False)
    recycled_materials = models.BooleanField("Recycled Materials", default=False)
    rigid_pvc = models.BooleanField("Rigid PVC", default=False)
    san = models.BooleanField("SAN", default=False)
    sebs = models.BooleanField("SEBS", default=False)
    silicone = models.BooleanField("Silicone", default=False)
    thermosets = models.BooleanField("Thermosets", default=False)
    tpes = models.BooleanField("TPEs", default=False)
    tpes_type = models.CharField("TPEs Type", max_length=100, blank=True)
    tpe_e = models.BooleanField("TPE-E", default=False)
    tpu = models.BooleanField("TPU", default=False)
    tpv = models.BooleanField("TPV", default=False)
    uhmwpe = models.BooleanField("UHMWPE", default=False)
    wpc = models.BooleanField("WPC", default=False)
    xlpe = models.BooleanField("XLPE", default=False)

    # --- APPLICATION MARKETS ---
    aerosol_overcaps = models.BooleanField("Aerosol Overcaps", default=False)
    aerospace = models.BooleanField("Aerospace", default=False)
    agricultural_drainage = models.BooleanField("Agricultural Drainage", default=False)
    agricultural_film = models.BooleanField("Agricultural Film", default=False)
    agricultural_greenhouse = models.BooleanField("Agricultural Greenhouse", default=False)
    agricultural_mulch = models.BooleanField("Agricultural Mulch", default=False)
    agricultural_silage = models.BooleanField("Agricultural Silage", default=False)
    air_conditioning = models.BooleanField("Air Conditioning", default=False)
    ambient_food = models.BooleanField("Ambient Food", default=False)
    appliances = models.BooleanField("Appliances", default=False)
    auto_fuel_tanks = models.BooleanField("Auto Fuel Tanks", default=False)
    automotive = models.BooleanField("Automotive", default=False)
    automotive_exterior = models.BooleanField("Automotive/Exterior", default=False)
    automotive_insulation = models.BooleanField("Automotive-Insulation", default=False)
    automotive_interior = models.BooleanField("Automotive/Interior", default=False)
    automotive_jacketing = models.BooleanField("Automotive-Jacketing", default=False)
    automotive_under_the_bonnet = models.BooleanField("Automotive/Under the Bonnet", default=False)
    automotive_vehicles_trucks = models.BooleanField("Automotive/Vehicles/Trucks", default=False)
    bakery_confectionary = models.BooleanField("Bakery/Confectionary", default=False)
    blinds = models.BooleanField("Blinds", default=False)
    boats_canoes_kayaks = models.BooleanField("Boats/Canoes/Kayaks", default=False)
    building = models.BooleanField("Building", default=False)
    building_film = models.BooleanField("Building Film", default=False)
    cable_protection = models.BooleanField("Cable Protection", default=False)
    caps_closures = models.BooleanField("Caps/Closures", default=False)
    carrier_bags = models.BooleanField("Carrier Bags", default=False)
    cartons_caps = models.BooleanField("Cartons Caps", default=False)
    chemical_un_tanks = models.BooleanField("Chemical UN Tanks", default=False)
    chilled_food = models.BooleanField("Chilled Food", default=False)
    cladding = models.BooleanField("Cladding", default=False)
    computer_cable_insulation = models.BooleanField("Computer Cable-Insulation", default=False)
    computer_cable_jacketing = models.BooleanField("Computer Cable-Jacketing", default=False)
    cosmetics_packaging = models.BooleanField("Cosmetics Packaging", default=False)
    crates_boxes = models.BooleanField("Crates/Boxes", default=False)
    cups = models.BooleanField("Cups", default=False)
    data_cable_insulation = models.BooleanField("Data Cable-Insulation", default=False)
    data_cable_jacketing = models.BooleanField("Data Cable-Jacketing", default=False)
    decking = models.BooleanField("Decking", default=False)
    display = models.BooleanField("Display", default=False)
    door = models.BooleanField("Door", default=False)
    drainage_sewerage = models.BooleanField("Drainage Sewerage", default=False)
    dvd_cds = models.BooleanField("DVD/CDs", default=False)
    electrical = models.BooleanField("Electrical", default=False)
    electrical_components = models.BooleanField("Electrical Components", default=False)
    electrical_conduit = models.BooleanField("Electrical Conduit", default=False)
    fast_food = models.BooleanField("Fast Food", default=False)
    film_on_reel = models.BooleanField("Film on Reel", default=False)
    floor_panels = models.BooleanField("Floor Panels", default=False)
    flooring = models.BooleanField("Flooring", default=False)
    food_drink = models.BooleanField("Food/Drink", default=False)
    footballs = models.BooleanField("Footballs", default=False)
    freezer_film = models.BooleanField("Freezer Film", default=False)
    frozen_food = models.BooleanField("Frozen Food", default=False)
    fruit_vegetable = models.BooleanField("Fruit/Vegetable", default=False)
    furniture = models.BooleanField("Furniture", default=False)
    gas_transmission_distribution = models.BooleanField("Gas Transmission Distribution", default=False)
    glazing = models.BooleanField("Glazing", default=False)
    heating_oil_diesel_tanks = models.BooleanField("Heating Oil Diesel Tanks", default=False)
    high_voltage_36k_insulation = models.BooleanField("High Voltage 36K-Insulation", default=False)
    high_voltage_36k_jacketing = models.BooleanField("High Voltage 36K-Jacketing", default=False)
    horticulture_agriculture = models.BooleanField("Horticulture/Agriculture", default=False)
    household_chemicals = models.BooleanField("Household Chemicals", default=False)
    houseware = models.BooleanField("Houseware", default=False)
    housewares_non_electrical = models.BooleanField("Housewares/Non Electrical", default=False)
    hygiene_film = models.BooleanField("Hygiene Film", default=False)
    ibcs = models.BooleanField("IBCs", default=False)
    industrial_chemicals = models.BooleanField("Industrial Chemicals", default=False)
    industrial_sacks = models.BooleanField("Industrial Sacks", default=False)
    insulation = models.BooleanField("Insulation", default=False)
    internal_hot_cold_plumbing_heating = models.BooleanField("Internal Hot & Cold Plumbing Heating", default=False)
    internal_soil_waste_sewerage = models.BooleanField("Internal Soil Waste Sewerage", default=False)
    irrigation = models.BooleanField("Irrigation", default=False)
    laminating_film = models.BooleanField("Laminating Film", default=False)
    lids = models.BooleanField("Lids", default=False)
    lighting = models.BooleanField("Lighting", default=False)
    low_voltage_1k_insulation = models.BooleanField("Low Voltage 1K-Insulation", default=False)
    low_voltage_1k_jacketing = models.BooleanField("Low Voltage 1K-Jacketing", default=False)
    marine_fishing = models.BooleanField("Marine/Fishing", default=False)
    materials_handling_boxes = models.BooleanField("Materials Handling Boxes", default=False)
    materials_handling_pallets = models.BooleanField("Materials Handling Pallets", default=False)
    meat_fish = models.BooleanField("Meat/Fish", default=False)
    medical = models.BooleanField("Medical", default=False)
    medical_containers = models.BooleanField("Medical Containers", default=False)
    medical_devices = models.BooleanField("Medical Devices", default=False)
    medium_voltage_1_36k_insulation = models.BooleanField("Medium Voltage 1-36K-Insulation", default=False)
    medium_voltage_1_36k_jacketing = models.BooleanField("Medium Voltage 1-36K-Jacketing", default=False)
    membrane = models.BooleanField("Membrane", default=False)
    metallic_insulation = models.BooleanField("Metallic-Insulation", default=False)
    metallic_jacketing = models.BooleanField("Metallic-Jacketing", default=False)
    microphone_cable_insulation = models.BooleanField("Microphone Cable-Insulation", default=False)
    microphone_cable_jacketing = models.BooleanField("Microphone Cable-Jacketing", default=False)
    mining_insulation = models.BooleanField("Mining-Insulation", default=False)
    mining_jacketing = models.BooleanField("Mining-Jacketing", default=False)
    optical_insulation = models.BooleanField("Optical-Insulation", default=False)
    optical_jacketing = models.BooleanField("Optical-Jacketing", default=False)
    ovenable = models.BooleanField("Ovenable", default=False)
    packaging = models.BooleanField("Packaging", default=False)
    pails = models.BooleanField("Pails", default=False)
    pannelling = models.BooleanField("Pannelling", default=False)
    personal_care = models.BooleanField("Personal Care", default=False)
    pet_accessories = models.BooleanField("Pet Accessories", default=False)
    pipe_fittings = models.BooleanField("Pipe Fittings", default=False)
    plenum_insulation = models.BooleanField("Plenum-Insulation", default=False)
    plenum_jacketing = models.BooleanField("Plenum-Jacketing", default=False)
    pos_mannequins_displays = models.BooleanField("POS/Mannequins/Displays", default=False)
    preform = models.BooleanField("Preform", default=False)
    protective_packaging = models.BooleanField("Protective Packaging", default=False)
    pumps = models.BooleanField("Pumps", default=False)
    push_on_caps = models.BooleanField("Push-on Caps", default=False)
    refuse_sacks = models.BooleanField("Refuse Sacks", default=False)
    retail_pos_packaging = models.BooleanField("Retail/POS Packaging", default=False)
    road_furniture = models.BooleanField("Road Furniture", default=False)
    road_railways_drainage = models.BooleanField("Road Railways Drainage", default=False)
    roof_gutter_systems = models.BooleanField("Roof Gutter Systems", default=False)
    screwcaps = models.BooleanField("Screwcaps", default=False)
    seals_gaskets = models.BooleanField("Seals/Gaskets", default=False)
    septic_tanks = models.BooleanField("Septic Tanks", default=False)
    shrink_fill_collation = models.BooleanField("Shrink Fill Collation", default=False)
    shrink_film_pallet = models.BooleanField("Shrink Film Pallet", default=False)
    shutters = models.BooleanField("Shutters", default=False)
    soffits_bargeboard_compact = models.BooleanField("Soffits Bargeboard Compact", default=False)
    soffits_bargeboard_foamed = models.BooleanField("Soffits Bargeboard Foamed", default=False)
    sport_leisure = models.BooleanField("Sport/Leisure", default=False)
    stationery_supplies = models.BooleanField("Stationery Supplies", default=False)
    storm_water_drainage = models.BooleanField("Storm Water Drainage", default=False)
    stretch_film = models.BooleanField("Stretch Film", default=False)
    stretch_hood = models.BooleanField("Stretch Hood", default=False)
    technical_moulding = models.BooleanField("Technical Moulding", default=False)
    telectronics = models.BooleanField("Telectronics", default=False)
    thin_wall_food_packaging = models.BooleanField("Thin Wall Food Packaging", default=False)
    toys = models.BooleanField("Toys", default=False)
    trunking = models.BooleanField("Trunking", default=False)
    tubes = models.BooleanField("Tubes", default=False)
    underground_fittings = models.BooleanField("Underground Fittings", default=False)
    waste_container_bottle_banks = models.BooleanField("Waste Container/Bottle Banks", default=False)
    water_supply_distribution = models.BooleanField("Water Supply Distribution", default=False)
    water_tank_other_tanks = models.BooleanField("Water Tank/Other Tanks", default=False)
    window = models.BooleanField("Window", default=False)
    yellow_fats = models.BooleanField("Yellow Fats", default=False)

    # Text descriptions for application areas
    automotive_description = models.TextField("Automotive Description", blank=True)
    electrical_description = models.TextField("Electrical Description", blank=True)
    houseware_description = models.TextField("Houseware Description", blank=True)
    medical_description = models.TextField("Medical Description", blank=True)
    packaging_description = models.TextField("Packaging Description", blank=True)
    other_products = models.TextField("Other Products", blank=True)
    main_applications = models.CharField("Main Applications", max_length=255, blank=True)
    other_industrial_markets = models.CharField("Other Industrial Markets", max_length=255, blank=True)
    other_food_packaging = models.CharField("Other Food Packaging", max_length=255, blank=True)
    non_food_packaging = models.CharField("Non Food Packaging", max_length=255, blank=True)
    construction_other = models.CharField("Construction Other", max_length=255, blank=True)

    # --- SERVICES ---
    assembly = models.BooleanField("Assembly", default=False)
    clean_room = models.BooleanField("Clean Room", default=False)
    design = models.BooleanField("Design", default=False)
    electroplating_metalizing = models.BooleanField("Electroplating/Metalizing", default=False)
    embossing = models.BooleanField("Embossing", default=False)
    filling = models.BooleanField("Filling", default=False)
    gas_water_assisted_moulding = models.BooleanField("Gas Water Assisted Moulding", default=False)
    high_frequency_welding = models.BooleanField("High Frequency Welding", default=False)
    hot_foil_stamping = models.BooleanField("Hot Foil Stamping", default=False)
    inmould_labelling = models.BooleanField("Inmould Labelling", default=False)
    insert_moulding = models.BooleanField("Insert Moulding", default=False)
    just_in_time = models.BooleanField("Just in Time", default=False)
    labelling = models.BooleanField("Labelling", default=False)
    machining = models.BooleanField("Machining", default=False)
    offset_printing = models.BooleanField("Offset Printing", default=False)
    pad_printing = models.BooleanField("Pad Printing", default=False)
    painting = models.BooleanField("Painting", default=False)
    printing = models.BooleanField("Printing", default=False)
    product_development = models.BooleanField("Product Development", default=False)
    product_lamination = models.BooleanField("Product Lamination", default=False)
    recycling = models.BooleanField("Recycling", default=False)
    silk_screen_printing = models.BooleanField("Silk Screen Printing", default=False)
    tool_design = models.BooleanField("Tool Design", default=False)
    tool_manufacture = models.BooleanField("Tool Manufacture", default=False)
    twin_multi_shot_moulding = models.BooleanField("Twin Multi Shot Moulding", default=False)
    ultrasonic_welding = models.BooleanField("Ultrasonic Welding", default=False)
    welding = models.BooleanField("Welding", default=False)
    flexo_printing = models.BooleanField("Flexo Printing", default=False)
    gravure_printing = models.BooleanField("Gravure Printing", default=False)
    three_d_printing = models.BooleanField("3D Printing", default=False)
    other_printing = models.CharField("Other Printing", max_length=255, blank=True)
    other_services = models.CharField("Other Services", max_length=255, blank=True)
    other_welding = models.CharField("Other Welding", max_length=255, blank=True)

    # --- MACHINE & TECHNICAL SPECS ---
    minimal_lock_tonnes = models.IntegerField("Minimal Lock (in tonnes)", null=True, blank=True)
    maximum_lock_tonnes = models.IntegerField("Maximum Lock (in tonnes)", null=True, blank=True)
    minimum_shot_grammes = models.IntegerField("Minimum Shot (in grammes)", null=True, blank=True)
    maximum_shot_grammes = models.IntegerField("Maximum Shot (in grammes)", null=True, blank=True)
    number_of_machines = models.IntegerField("Number of Machines", null=True, blank=True)
    machinery_brand = models.CharField("Machinery Brand", max_length=255, blank=True)
    under_1_litre = models.BooleanField("Under 1 Litre", default=False)
    from_1_to_5_litres = models.BooleanField("From 1 to 5 Litres", default=False)
    from_5_to_25_litres = models.BooleanField("From 5 to 25 Litres", default=False)
    from_25_to_220_litres = models.BooleanField("From 25 to 220 Litres", default=False)
    over_220_litres = models.BooleanField("Over 220 Litres", default=False)
    multilayer = models.BooleanField("Multilayer", default=False)
    extrusion_blow_moulding_machines = models.IntegerField("Extrusion Blow Moulding Machines", null=True, blank=True)
    injection_blow_moulding_machines = models.IntegerField("Injection Blow Moulding Machines", null=True, blank=True)
    injection_stretch_blow_moulding_stage_1_machines = models.IntegerField(
        "Injection Stretch Blow Moulding Stage 1 Machines", null=True, blank=True)
    injection_stretch_blow_moulding_stage_2_machines = models.IntegerField(
        "Injection Stretch Blow Moulding Stage 2 Machines", null=True, blank=True)
    buy_in_preform = models.BooleanField("Buy in Preform", default=False)
    buy_in_preform_percentage = models.IntegerField("Buy in Preform Percentage", null=True, blank=True)
    minimum_size = models.CharField("Minimum Size", max_length=100, blank=True)
    maximum_size = models.CharField("Maximum Size", max_length=100, blank=True)
    minimum_width_mm = models.FloatField("Minimum width (in mm)", null=True, blank=True)
    maximum_width_mm = models.FloatField("Maximum width (in mm)", null=True, blank=True)
    number_of_layers = models.IntegerField("Number of Layers", null=True, blank=True)
    cast_lines = models.IntegerField("Cast Lines", null=True, blank=True)
    blown_lines = models.IntegerField("Blow Lines", null=True, blank=True)
    number_of_colours = models.IntegerField("Number of Colours", null=True, blank=True)
    other_films = models.CharField("Other Films", max_length=255, blank=True)
    biodegradable_bags = models.BooleanField("Biodegradable Bags", default=False)
    other_bags = models.BooleanField("Other Bags", default=False)
    other_sacks = models.BooleanField("Other Sacks", default=False)
    minimum_gauge_mm = models.FloatField("Minimum gauge (in mm)", null=True, blank=True)
    maximum_gauge_mm = models.FloatField("Maximum gauge (in mm)", null=True, blank=True)
    flame_retardant_sheet = models.BooleanField("Flame Retardant Sheet", default=False)
    embossed_sheet = models.BooleanField("Embossed Sheet", default=False)
    coated_sheet = models.BooleanField("Coated Sheet", default=False)
    laminated_sheet = models.BooleanField("Laminated Sheet", default=False)
    foamed_sheet = models.BooleanField("Foamed Sheet", default=False)
    corrugated_sheet = models.BooleanField("Corrugated Sheet", default=False)
    profiled_sheet = models.BooleanField("Profiled Sheet", default=False)
    coextruded_sheet = models.BooleanField("Coextruded Sheet", default=False)
    plain_sheet = models.BooleanField("Plain Sheet", default=False)
    cross_linked_sheet = models.BooleanField("Cross Linked Sheet", default=False)
    other_type_of_sheet = models.CharField("Other Type of Sheet", max_length=255, blank=True)
    extrusion_process = models.BooleanField("Extrusion Process", default=False)
    number_of_extrusion_lines = models.IntegerField("Number of Extrusion Lines", null=True, blank=True)
    coextrusion_process = models.BooleanField("Coextrusion Process", default=False)
    number_of_coextrusion_lines = models.IntegerField("Number of Coextrusion Lines", null=True, blank=True)
    calendering_process = models.BooleanField("Calendering Process", default=False)
    number_of_calendering_lines = models.IntegerField("Number of Calendering Lines", null=True, blank=True)
    pressing_process = models.BooleanField("Pressing Process", default=False)
    number_of_pressed_lines = models.IntegerField("Number of Pressed Lines", null=True, blank=True)
    liquid_cell_casting = models.BooleanField("Liquid Cell Casting", default=False)
    number_of_lcc_line = models.IntegerField("Number of LCC Line", null=True, blank=True)
    in_line_process = models.CharField("In Line Process", max_length=255, blank=True)
    below_ground_pressure = models.BooleanField("Below Ground Pressure", default=False)
    below_ground_non_pressure = models.BooleanField("Below Ground Non Pressure", default=False)
    above_ground_pressure = models.BooleanField("Above Ground Pressure", default=False)
    above_ground_non_pressure = models.BooleanField("Above Ground Non Pressure", default=False)
    other_pipes = models.CharField("Other Pipes", max_length=255, blank=True)
    up_to_32_mm = models.BooleanField("Up to 32 mm", default=False)
    between_33_63_mm = models.BooleanField("Between 33 & 63 mm", default=False)
    between_64_90_mm = models.BooleanField("Between 64 & 90 mm", default=False)
    between_91_109_mm = models.BooleanField("Between 91 & 109 mm", default=False)
    between_110_160_mm = models.BooleanField("Between 110 & 160 mm", default=False)
    between_161_250_mm = models.BooleanField("Between 161 & 250 mm", default=False)
    between_251_400_mm = models.BooleanField("Between 251 & 400 mm", default=False)
    between_401_500_mm = models.BooleanField("Between 401 & 500 mm", default=False)
    between_501_630_mm = models.BooleanField("Between 501 & 630 mm", default=False)
    between_631_1000_mm = models.BooleanField("Between 631 & 1000 mm", default=False)
    between_1001_1200_mm = models.BooleanField("Between 1001 & 1200 mm", default=False)
    over_1200_mm = models.BooleanField("Over 1200 mm", default=False)
    coextruded_foam_core = models.BooleanField("Coextruded Foam Core", default=False)
    twin_wall = models.BooleanField("Twin Wall", default=False)
    multilayer_polymeric = models.BooleanField("Multilayer Polymeric", default=False)
    multilayer_polymer_metal = models.BooleanField("Multilayer Polymer Metal", default=False)
    reinforced_wall = models.BooleanField("Reinforced Wall", default=False)
    solid_wall = models.BooleanField("Solid Wall", default=False)
    other_technologies = models.CharField("Other Technologies", max_length=255, blank=True)
    hydraulic = models.BooleanField("Hydraulic", default=False)
    pneumatic = models.BooleanField("Pneumatic", default=False)
    flexible = models.BooleanField("Flexible", default=False)
    rigid_shapes = models.BooleanField("Rigid Shapes", default=False)
    monolayer = models.BooleanField("Monolayer", default=False)
    extrusion_foam = models.BooleanField("Extrusion Foam", default=False)
    corrugated_extrusion = models.BooleanField("Corrugated Extrusion", default=False)
    bi_colour = models.BooleanField("Bi Colour", default=False)
    minimum_diameter_mm = models.IntegerField("Minimum diameter (in mm)", null=True, blank=True)
    maximum_diameter_mm = models.IntegerField("Maximum diameter (in mm)", null=True, blank=True)
    reprocessing = models.BooleanField("Reprocessing", default=False)
    colour_compounds = models.BooleanField("Colour Compounds", default=False)
    flame_retardant_compounds = models.BooleanField("Flame Retardant Compounds", default=False)
    mineral_filled_compounds = models.BooleanField("Mineral Filled Compounds", default=False)
    glass_filled_compounds = models.BooleanField("Glass Filled Compounds", default=False)
    elastomer_modified_compounds = models.BooleanField("Elastomer Modified Compounds", default=False)
    cross_linked_compounds = models.BooleanField("Cross Linked Compounds", default=False)
    carbon_fibre_compounds = models.BooleanField("Carbon Fibre Compounds", default=False)
    natural_fibre_compounds = models.BooleanField("Natural Fibre Compounds", default=False)
    other_compounds = models.CharField("Other Compounds", max_length=255, blank=True)
    compounds_percentage = models.IntegerField("Compounds Percentage", null=True, blank=True)
    compounds_applications = models.CharField("Compounds Applications", max_length=255, blank=True)
    black_masterbatch = models.BooleanField("Black Masterbatch", default=False)
    white_masterbatch = models.BooleanField("White Masterbatch", default=False)
    colour_masterbatch = models.BooleanField("Colour Masterbatch", default=False)
    additive_masterbatch = models.BooleanField("Additive Masterbatch", default=False)
    liquid_masterbatch = models.BooleanField("Liquid Masterbatch", default=False)
    other_masterbatches = models.CharField("Other Masterbatches", max_length=255, blank=True)
    masterbatch_percentage = models.IntegerField("Masterbatch Percentage", null=True, blank=True)
    masterbatches_applications = models.CharField("Masterbatch Applications", max_length=255, blank=True)
    twin_screw_extruders = models.IntegerField("Twin Screw Extruders", null=True, blank=True)
    single_screw_extruders = models.IntegerField("Single Screw Extruders", null=True, blank=True)
    batch_mixers = models.IntegerField("Batch Mixers", null=True, blank=True)
    polymer_producer = models.BooleanField("Polymer Producer", default=False)
    production_volume_number = models.IntegerField("Production Volume Number", null=True, blank=True)
 
    project = models.ForeignKey(
        DataCollectionProject,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='unverified_sites',
        help_text="Project this site belongs to"
)
    
    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING,
        db_index=True
    )
    
    collected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='collected_sites'
    )
    collected_date = models.DateTimeField(auto_now_add=True)
    
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_sites'
    )
    verified_date = models.DateTimeField(null=True, blank=True)
    
    source = models.CharField(
        max_length=20,
        choices=DataSource.choices,
        default=DataSource.PHONE_CALL
    )
    
    priority = models.CharField(
        max_length=10,
        choices=PriorityLevel.choices,
        default=PriorityLevel.MEDIUM
    )
    
    notes = models.TextField(blank=True)
    rejection_reason = models.TextField(blank=True)
    data_quality_score = models.FloatField(default=0.0)
    
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_sites'
    )
    
    is_duplicate = models.BooleanField(default=False)
    duplicate_of = models.ForeignKey(
        'SuperdatabaseRecord',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='duplicate_unverified_sites'
    )
    
    # Calling Workflow Fields
    calling_status = models.CharField(
        max_length=20,
        choices=CallingStatus.choices,
        default=CallingStatus.NOT_STARTED,
        verbose_name='Calling Status',
        help_text='Current status in the calling workflow'
    )
    
    calling_status_changed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Calling Status Changed At',
        help_text='Timestamp when calling status was last changed'
    )
    
    calling_status_changed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='calling_status_changes',
        verbose_name='Calling Status Changed By'
    )
    
    is_pre_filled = models.BooleanField(
        default=False,
        verbose_name='Has Pre-filled Data',
        help_text='True if this site was created by admin with initial data'
    )
    
    pre_filled_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='pre_filled_sites',
        verbose_name='Pre-filled By'
    )
    
    pre_filled_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Pre-filled At'
    )
    
    # Add to existing fields section
    total_calls = models.IntegerField(
        default=0,
        verbose_name='Total Calls Made',
        help_text='Number of call attempts made'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'unverified_sites'
        ordering = ['-created_at']
        verbose_name = 'Unverified Site'
        verbose_name_plural = 'Unverified Sites'
        indexes = [
            models.Index(fields=['verification_status']),
            models.Index(fields=['category']),
            models.Index(fields=['country']),
            models.Index(fields=['collected_by']),
            models.Index(fields=['verified_by']),
            models.Index(fields=['priority']),
            models.Index(fields=['-created_at']),
        ]
    
    def __str__(self):
        return f"{self.company_name} - {self.get_verification_status_display()}"
    
    def calculate_data_quality_score(self):
        """
        Calculate data quality score based on field completeness.
        Uses the improved tiered calculation from quality_score_utils.
        Returns a score from 0-100.
        """
        from .quality_score_utils import calculate_data_quality_score
        
        score = calculate_data_quality_score(self)
        self.data_quality_score = score
        return self.data_quality_score
    
    def check_for_duplicates(self):
        """
        Check if this site already exists in SuperdatabaseRecord.
        Sets is_duplicate flag and duplicate_of relationship if found.
        """
        from django.db.models import Q
        
        if not self.company_name or not self.country:
            return False
        
        # Search for potential duplicates
        potential_duplicates = SuperdatabaseRecord.objects.filter(
            Q(company_name__iexact=self.company_name) &
            Q(country__iexact=self.country)
        )
        
        # If address matches too, it's likely a duplicate
        if self.address_1:
            potential_duplicates = potential_duplicates.filter(
                address_1__iexact=self.address_1
            )
        
        if potential_duplicates.exists():
            self.is_duplicate = True
            self.duplicate_of = potential_duplicates.first()
            return True
        
        self.is_duplicate = False
        self.duplicate_of = None
        return False
    
    def update_calling_status(self, new_status, changed_by, status_notes=''):
        """
        Update calling status and create history entry
        """
        from django.utils import timezone
        
        # Store old status
        old_status = self.calling_status
        
        # Update status
        self.calling_status = new_status
        self.calling_status_changed_by = changed_by
        self.calling_status_changed_at = timezone.now()
        self.save(update_fields=[
            'calling_status',
            'calling_status_changed_by',
            'calling_status_changed_at'
        ])
        
        # Create history entry
        CallingStatusHistory.objects.create(
            site=self,
            old_status=old_status,
            new_status=new_status,
            status_notes=status_notes,
            changed_by=changed_by
        )
        
        # If status is YELLOW, create notification for admin
        if new_status == 'YELLOW':
            self._create_yellow_status_notification()
    
    def _create_yellow_status_notification(self):
        '''Create notification when site needs alternative numbers'''
        from notifications.models import Notification
        from accounts.models import UserRole
        
        # Get all admin users
        admin_users = User.objects.filter(
            role__in=[UserRole.SUPERADMIN, UserRole.STAFF_ADMIN]
        )
        
        # Create notification for each admin
        for admin in admin_users:
            Notification.objects.create(
                user=admin,
                notification_type='system',
                title='Alternative Numbers Needed',
                message=f'{self.company_name} needs alternative phone numbers. Data collector: {self.collected_by.full_name if self.collected_by else "Unknown"}',
                related_site_id=str(self.site_id)
            )
    
    def add_call_log(self, notes, created_by):
        '''Add a new call log entry'''
        # Get next call number
        last_call = self.call_logs.order_by('-call_number').first()
        next_number = (last_call.call_number + 1) if last_call else 1
        
        # Create call log
        call_log = CallLog.objects.create(
            site=self,
            call_number=next_number,
            call_notes=notes,
            created_by=created_by
        )
        
        # Update total calls
        self.total_calls = next_number
        self.save(update_fields=['total_calls'])
        
        return call_log
    
    def get_field_confirmation_status(self, field_name):
        '''Get confirmation status for a specific field'''
        try:
            return self.field_confirmations.get(field_name=field_name)
        except FieldConfirmation.DoesNotExist:
            return None
    
    @property
    def calling_status_display_with_color(self):
        '''Return status with appropriate color class'''
        colors = {
            CallingStatus.NOT_STARTED: 'bg-gray-100 text-gray-800',
            CallingStatus.YELLOW: 'bg-yellow-100 text-yellow-800',
            CallingStatus.RED: 'bg-red-100 text-red-800',
            CallingStatus.PURPLE: 'bg-purple-100 text-purple-800',
            CallingStatus.BLUE: 'bg-blue-100 text-blue-800',
            CallingStatus.GREEN: 'bg-green-100 text-green-800',
        }
        return {
            'status': self.get_calling_status_display(),
            'color': colors.get(self.calling_status, 'bg-gray-100 text-gray-800')
        }
    
    def transfer_to_superdatabase(self, transferred_by=None):
        """
        Transfer this site's data to the SuperdatabaseRecord.
        Updates status to TRANSFERRED and creates history entry.
        
        Args:
            transferred_by: User who performed the transfer
            
        Returns:
            SuperdatabaseRecord: The newly created record
            
        Raises:
            ValueError: If site is already transferred or not approved
        """
        from django.db import transaction
        
        # Refresh from database to get the latest status (prevent race conditions)
        self.refresh_from_db(fields=['verification_status'])
        
        # Check if already transferred
        if self.verification_status == VerificationStatus.TRANSFERRED:
            raise ValueError('This site has already been transferred to Superdatabase')
        
        # Check if approved
        if self.verification_status != VerificationStatus.APPROVED:
            raise ValueError(f'Site must be approved before transfer. Current status: {self.get_verification_status_display()}')
        
        # Fields to exclude from transfer (verification-specific fields)
        exclude_fields = {
            'site_id', 'verification_status', 'collected_by', 'verified_by',
            'collected_date', 'verified_date', 'source', 'priority',
            'notes', 'rejection_reason', 'data_quality_score',
            'assigned_to', 'is_duplicate', 'duplicate_of',
            'created_at', 'updated_at', 'project',
            'calling_status', 'calling_status_changed_at', 'calling_status_changed_by',
            'is_pre_filled', 'pre_filled_by', 'pre_filled_at', 'total_calls'
        }
        
        # Build data dict for SuperdatabaseRecord
        transfer_data = {}
        for field in self._meta.fields:
            field_name = field.name
            if field_name not in exclude_fields:
                # Check if field exists in SuperdatabaseRecord
                try:
                    SuperdatabaseRecord._meta.get_field(field_name)
                    transfer_data[field_name] = getattr(self, field_name)
                except Exception:
                    # Field doesn't exist in SuperdatabaseRecord, skip it
                    pass
        
        # Use atomic transaction to ensure both operations succeed or fail together
        with transaction.atomic():
            # Create SuperdatabaseRecord
            superdatabase_record = SuperdatabaseRecord.objects.create(**transfer_data)
            
            # Update status to TRANSFERRED using direct database update to ensure it persists
            # This bypasses any issues with the model's save() method
            UnverifiedSite.objects.filter(site_id=self.site_id).update(
                verification_status=VerificationStatus.TRANSFERRED
            )
            
            # Refresh the instance to get the updated status
            self.refresh_from_db()
            
            # Create history entry
            VerificationHistory.objects.create(
                site=self,
                action='TRANSFERRED',
                performed_by=transferred_by,
                comments=f'Transferred to Superdatabase (ID: {superdatabase_record.factory_id})'
            )
        
        return superdatabase_record


    def save(self, *args, **kwargs):
        """Auto-calculate quality score and check duplicates on save."""
        # Only calculate quality score and check duplicates if not a partial update
        update_fields = kwargs.get('update_fields')
        if update_fields is None:
            self.calculate_data_quality_score()
            self.check_for_duplicates()
        super().save(*args, **kwargs)


# --- Verification History Class ---
class VerificationHistory(models.Model):
    """
    Audit trail for all actions performed on unverified sites.
    """
    history_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, primary_key=True)
    
    site = models.ForeignKey(
        UnverifiedSite,
        on_delete=models.CASCADE,
        related_name='history'
    )
    
    action = models.CharField(
        max_length=20,
        choices=VerificationAction.choices
    )
    
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='verification_actions'
    )
    
    timestamp = models.DateTimeField(auto_now_add=True)
    
    old_status = models.CharField(
        max_length=20,
        blank=True,
        help_text="Previous verification status"
    )
    
    new_status = models.CharField(
        max_length=20,
        blank=True,
        help_text="New verification status"
    )
    
    comments = models.TextField(blank=True)
    
    # Store changed fields as JSON
    changes = models.JSONField(
        default=dict,
        blank=True,
        help_text="Dictionary of field changes"
    )
    
    class Meta:
        db_table = 'verification_history'
        ordering = ['-timestamp']
        verbose_name = 'Verification History'
        verbose_name_plural = 'Verification Histories'
        indexes = [
            models.Index(fields=['site', '-timestamp']),
            models.Index(fields=['performed_by']),
        ]
    
    def __str__(self):
        return f"{self.action} - {self.site.company_name} by {self.performed_by}"    
    

# --- Call Log Class ---
class CallLog(models.Model):
    """
    Tracks individual call attempts made to a site.
    Timeline display: "Nov 18, 2:30 PM | Call #1 | No answer"
    """
    
    call_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='Call ID'
    )
    
    site = models.ForeignKey(
        'UnverifiedSite',  # Reference to your UnverifiedSite model
        on_delete=models.CASCADE,
        related_name='call_logs',
        verbose_name='Site'
    )
    
    call_number = models.IntegerField(
        verbose_name='Call Number',
        help_text='Sequential number of this call (1, 2, 3, etc.)'
    )
    
    call_timestamp = models.DateTimeField(
        default=timezone.now,
        verbose_name='Call Timestamp',
        help_text='When the call was made'
    )
    
    call_notes = models.TextField(
        blank=True,
        verbose_name='Call Notes',
        help_text='Notes about this specific call (e.g., "No answer", "Spoke with receptionist")'
    )
    
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='call_logs_created',
        verbose_name='Created By'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Created At'
    )
    
    class Meta:
        ordering = ['call_number']
        verbose_name = 'Call Log'
        verbose_name_plural = 'Call Logs'
        indexes = [
            models.Index(fields=['site', 'call_number']),
            models.Index(fields=['site', '-call_timestamp']),
        ]
        unique_together = [['site', 'call_number']]  # Ensure unique call numbers per site
    
    def __str__(self):
        return f"Call #{self.call_number} - {self.site.company_name} - {self.call_timestamp.strftime('%b %d, %I:%M %p')}"
    
    @property
    def formatted_timestamp(self):
        """Return formatted timestamp: 'Nov 18, 2:30 PM'"""
        return self.call_timestamp.strftime('%b %d, %I:%M %p')


# --- Field Confirmation Class ---
class FieldConfirmation(models.Model):
    """
    Tracks which fields have been confirmed, marked as new, or are pre-filled.
    
    Field States:
    - Pre-filled: Data added by admin (is_pre_filled=True)
    - Confirmed: Data collector verified it's correct (is_confirmed=True)
    - New: Data collector added new information (is_new_data=True)
    - Unconfirmed: Field exists but not verified yet
    """
    
    confirmation_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='Confirmation ID'
    )
    
    site = models.ForeignKey(
        'UnverifiedSite',
        on_delete=models.CASCADE,
        related_name='field_confirmations',
        verbose_name='Site'
    )
    
    field_name = models.CharField(
        max_length=100,
        verbose_name='Field Name',
        help_text='Name of the field (e.g., "company_name", "phone_number")'
    )
    
    is_confirmed = models.BooleanField(
        default=False,
        verbose_name='Is Confirmed',
        help_text='True if data collector confirmed this field'
    )
    
    is_new_data = models.BooleanField(
        default=False,
        verbose_name='Is New Data',
        help_text='True if data collector added new information'
    )
    
    is_pre_filled = models.BooleanField(
        default=False,
        verbose_name='Is Pre-filled',
        help_text='True if this field was pre-filled by admin'
    )

    last_selected = models.CharField(
        max_length=20,
        choices=[
            ('is_pre_filled', 'Pre-filled'),
            ('is_confirmed', 'Confirmed'),
            ('is_new_data', 'New Data'),
        ],
        null=True,
        blank=True,
        verbose_name='Last Selected',
        help_text='Tracks which confirmation type was last selected for color coding'
    )    
    
    confirmed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='field_confirmations',
        verbose_name='Confirmed By'
    )
    
    confirmed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Confirmed At'
    )
    
    notes = models.TextField(
        blank=True,
        verbose_name='Notes',
        help_text='Optional notes about this field confirmation'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Created At'
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Updated At'
    )
    
    class Meta:
        verbose_name = 'Field Confirmation'
        verbose_name_plural = 'Field Confirmations'
        unique_together = [['site', 'field_name']]  # One confirmation per field per site
        indexes = [
            models.Index(fields=['site', 'field_name']),
            models.Index(fields=['site', 'is_confirmed']),
        ]
    
    def __str__(self):
        status = []
        if self.is_pre_filled:
            status.append('Pre-filled')
        if self.is_confirmed:
            status.append('Confirmed')
        if self.is_new_data:
            status.append('New')
        
        status_str = ', '.join(status) if status else 'Unconfirmed'
        return f"{self.site.company_name} - {self.field_name} ({status_str})"    


# --- Company Search Result Class ---
class CompanyResearchResult(models.Model):
    """
    Stores AI-generated company research results for future reference.
    Separate from Superdatabase and UnverifiedSite - purely for research history.
    """
    # Primary Key
    research_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name="Research ID"
    )
    
    # User who performed the research
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='research_results',
        verbose_name="Researcher"
    )
    
    # Search Query
    company_name = models.CharField(
        max_length=255,
        verbose_name="Company Name Searched"
    )
    country = models.CharField(
        max_length=100,
        verbose_name="Country Searched"
    )
    
    # AI Research Result (Full JSON response)
    result_data = models.JSONField(
        verbose_name="Research Result Data",
        help_text="Full JSON data returned from AI research"
    )
    
    # Model used for research (for tracking)
    model_used = models.CharField(
        max_length=100,
        verbose_name="AI Model Used",
        blank=True,
        null=True
    )
    
    # Timestamps
    searched_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Search Date/Time"
    )
    
    # Quick access fields (extracted from result_data for faster querying)
    official_name = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name="Official Company Name"
    )
    city = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="City"
    )
    industry = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name="Industry"
    )
    website = models.URLField(
        max_length=500,
        blank=True,
        null=True,
        verbose_name="Website"
    )
    
    # Metadata
    is_favorite = models.BooleanField(
        default=False,
        verbose_name="Marked as Favorite"
    )
    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name="User Notes"
    )
    
    class Meta:
        verbose_name = "Company Research Result"
        verbose_name_plural = "Company Research Results"
        ordering = ['-searched_at']
        indexes = [
            models.Index(fields=['user', '-searched_at']),
            models.Index(fields=['company_name', 'country']),
            models.Index(fields=['is_favorite']),
        ]
    
    def __str__(self):
        return f"{self.company_name} ({self.country}) - {self.searched_at.strftime('%Y-%m-%d')}"
    
    def save(self, *args, **kwargs):
        # Extract quick-access fields from result_data
        if self.result_data:
            self.official_name = self.result_data.get('official_name', '')
            self.city = self.result_data.get('city', '')
            self.industry = self.result_data.get('industry', '')
            self.website = self.result_data.get('website', '')
            self.model_used = self.result_data.get('model_used', '')
        
        super().save(*args, **kwargs)

