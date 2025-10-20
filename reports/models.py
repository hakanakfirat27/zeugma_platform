import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.contrib.auth import get_user_model
from decimal import Decimal

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
        Update the record count based on filter criteria.
        Supports both single category and multiple categories.
        """
        from django.db.models import Q

        queryset = SuperdatabaseRecord.objects.all()

        # Handle categories (can be single string or array of strings)
        if 'categories' in self.filter_criteria:
            categories = self.filter_criteria['categories']

            if isinstance(categories, list) and len(categories) > 0:
                # Multiple categories - use OR logic
                category_query = Q()
                for category in categories:
                    category_query |= Q(category__iexact=category)
                queryset = queryset.filter(category_query)
            elif isinstance(categories, str):
                # Single category as string
                queryset = queryset.filter(category__iexact=categories)

        # Backward compatibility: handle old 'category' field (single category)
        elif 'category' in self.filter_criteria and self.filter_criteria['category']:
            queryset = queryset.filter(category__iexact=self.filter_criteria['category'])

        # Apply country filter
        if 'country' in self.filter_criteria:
            countries = self.filter_criteria['country']
            if isinstance(countries, list) and len(countries) > 0:
                queryset = queryset.filter(country__in=countries)

        # Apply boolean filters (materials, properties, etc.)
        for field, value in self.filter_criteria.items():
            if field not in ['category', 'categories', 'country']:
                if isinstance(value, bool):
                    queryset = queryset.filter(**{field: value})

        self.record_count = queryset.count()
        self.save(update_fields=['record_count'])

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
        """Renew the subscription"""
        from dateutil.relativedelta import relativedelta

        if plan:
            self.plan = plan

        self.start_date = self.end_date + timezone.timedelta(days=1)

        if self.plan == SubscriptionPlan.MONTHLY:
            self.end_date = self.start_date + relativedelta(months=1)
            self.amount_paid = self.report.monthly_price
        else:
            self.end_date = self.start_date + relativedelta(years=1)
            self.amount_paid = self.report.annual_price

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