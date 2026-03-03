import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type ProductDocument = Product & Document

@Schema()
export class Product extends Document {
  // --- Mahsulot qismi ---
  @Prop({ required: false }) // Diqqat: required: false qiling, chunki user saqlanganda title bo'lmaydi
  title: string;

  @Prop()
  description: string;

  @Prop()
  price: number;

  @Prop()
  imageUrl: string;

  @Prop()
  category: 'drinks' | 'foods' | 'sweets';

//foydalanuvchi
  @Prop({ unique: true, sparse: true }) 
  chatId: number;

  @Prop()
  first_name: string;

  @Prop()
  phoneNumber: string;

  @Prop()
  lastState: string;

  @Prop({ type: Object })
  location: { lat: number; lng: number };
}

export const ProductSchema = SchemaFactory.createForClass(Product);