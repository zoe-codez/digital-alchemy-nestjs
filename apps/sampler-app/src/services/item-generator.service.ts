import { MainMenuEntry } from "@digital-alchemy/tty";
import { is, TitleCase } from "@digital-alchemy/utilities";
import { faker } from "@faker-js/faker";
import { Injectable } from "@nestjs/common";

/**
 * Just a few items to make life interesting
 */
enum FakerSources {
  bikes = "bikes",
  vin = "vin",
  none = "none",
  address = "address",
  filePath = "filePath",
  animal = "animal",
  product = "product",
}

@Injectable()
export class ItemGeneratorService {
  public generateMenuItem<VALUE>(
    labelType: FakerSources,
    value: VALUE,
    index = "",
  ): MainMenuEntry<VALUE> {
    let label: string;
    let type: string = labelType;
    switch (labelType) {
      case FakerSources.bikes:
        label = faker.vehicle.bicycle();
        break;
      case FakerSources.filePath:
        label = faker.system.filePath();
        break;
      case FakerSources.vin:
        label = faker.vehicle.vin();
        break;
      case FakerSources.product:
        label = faker.commerce.productName();
        break;
      case FakerSources.address:
        label = faker.address.streetAddress();
        break;
      case FakerSources.animal: {
        const keys = Object.keys(faker.animal).filter(
          i => is.function(faker.animal[i]) && !["type"].includes(i),
        );
        const animalType = keys[Math.floor(Math.random() * keys.length)];
        label = faker.animal[animalType]();
        type = animalType;
        break;
      }
    }

    return {
      entry: [`${label}${index}`, value],
      helpText: is.random([
        faker.hacker.phrase(),
        faker.company.bs(),
        faker.company.catchPhrase(),
        faker.commerce.productDescription(),
      ]),
      type: TitleCase(type),
    };
  }
}
