import { Schema, model } from 'mongoose';

export const ExampleModel = model('Example', new Schema({ name: String }));
