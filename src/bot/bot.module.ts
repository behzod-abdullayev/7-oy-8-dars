import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ProductService } from "./bot.service";
import { Product, ProductSchema } from "src/schema/product.schema";

@Module({
    imports: [MongooseModule.forFeature([{name: Product.name, schema: ProductSchema}])],
    providers: [ProductService]
})


export class ProductModule {}
