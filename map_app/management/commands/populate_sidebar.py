import pandas as pd
from map_app.models import Feature
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    def handle(self, *args, **kwargs):
        excel_file_path = "config_files/Portal_Dataset.xlsx"
        data = pd.read_excel(excel_file_path)
        print(data)

        # Dictionary to hold main features
        features_dict = {}

        # Iterate through each row in the DataFrame
        for index, row in data.iterrows():
            category = row.get("category")
            name = row.get("name")
            comp_value = row.get("comp")  # Get the value from the comp column
            address = row.get("address")  # Get the address value if needed
            vis_params = row.get("vis_params")
            params = row.get("params")
            try:
                visuals = (
                    eval(vis_params) if isinstance(vis_params, str) else vis_params
                )
            except Exception as e:
                print(f"Error parsing vis_params: {e}")
                visuals = vis_params  # Use as-is if parsing fails

            # Try to parse params as JSON
            try:
                feature_params = eval(params) if isinstance(params, str) else params
            except Exception as e:
                print(f"Error parsing params: {e}")
                feature_params = params
            # Skip rows with both category and name missing
            if pd.isnull(category) and pd.isnull(name):
                continue

            # Handle case where only the category is given (non-sub feature)
            if pd.notnull(category) and pd.isnull(name):
                if category not in features_dict:
                    # Determine comp_type based on the presence of comp value
                    comp_type = (
                        1 if pd.notnull(comp_value) else 0
                    )  # 1 = static, 0 = dynamic

                    # Create a non-sub Feature for the category
                    main_feature = Feature.objects.create(
                        name=category,
                        comp_type=comp_type,
                        comp=comp_value,  # Use the specific sub_comp value from the DataFrame
                        url=address,  # Use the specific URL from the DataFrame
                        url_params=[],
                        type=0,  # Marked as a sub-feature
                        address=address,  # Use the address value
                        visuals=visuals,
                        params=feature_params,
                        sub_bool=False,  # This is a sub-feature
                        sub=None,
                        credit=row.get("credits", 0.0),
                        render=False,
                        plan=0,
                        info=row.get("info"),
                    )
                    features_dict[category] = main_feature
                continue  # Skip further processing for this row

            # Create or retrieve the main feature for the category
            if category not in features_dict:
                # Determine comp_type based on the presence of comp value
                comp_type = (
                    1 if pd.notnull(comp_value) else 0
                )  # 1 = static, 0 = dynamic

                # Create a main Feature for the category
                main_feature = Feature.objects.create(
                    name=category,
                    comp_type=0,  # Assuming "Dynamic" is default
                    comp=None, 
                    url=None,
                    url_params=None,
                    type=0,  # Set a default type or adjust as needed
                    address=None,
                    visuals=None,
                    params=None,
                    sub_bool=True,  # Indicates this Feature has sub-features
                    sub=[],  # Will populate this later
                    info=None,
                    render=True,
                    credit=0.0,
                    plan=0
                )
                features_dict[category] = main_feature

            # Try to parse vis_params as JSON
            # Use as-is if parsing fails

            # Determine comp_type for the sub-feature
            sub_comp_type = (
                1 if pd.notnull(comp_value) else 0
            )  # 1 = static, 0 = dynamic

            # Create a sub-feature
            sub_feature = Feature.objects.create(
                name=name,
                comp_type=sub_comp_type,
                comp=comp_value,  # Use the specific sub_comp value from the DataFrame
                url=address,  # Use the specific URL from the DataFrame
                url_params=[],
                type=0,  # Marked as a sub-feature
                address=address,  # Use the address value
                visuals=visuals,
                params=feature_params,
                sub_bool=False,  # This is a sub-feature
                sub=None,
                credit=row.get("credits", 0.0),
                render=False,
                plan=0,
                info=row.get("info"),
            )

            # Save the sub-feature and add its ID to the parent feature
            sub_feature.save()
            features_dict[category].sub.append(sub_feature.id)

        # Save all main features with their sub-features
        for main_feature in features_dict.values():
            try:
                main_feature.save()
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"Error saving {main_feature.name}: {e}")
                )
