import { Schema, model } from 'mongoose';

const orgSettingsSchema = new Schema(
  {
    orgName:         { type: String, required: true, default: 'Spiritual Organization' },
    address:         { type: String, default: '' },
    contactNumber:   { type: String, default: '' },
    email:           { type: String, default: '' },
    gstNumber:       { type: String, default: '' },
    logoUrl:         { type: String, default: '' },
    receiptHeader:   { type: String, default: '' },
    receiptFooter:   { type: String, default: 'Thank you for your seva' },
    spiritualQuote:  { type: String, default: 'Om Shanti' },
    thankYouMessage: { type: String, default: 'Hari Om Tat Sat' },
    printerWidth:    { type: Number, default: 58 },           // 58 or 80
    fontSize:        { type: String, default: 'normal' },     // small | normal | large
    textAlignment:   { type: String, default: 'center' },     // left | center | right
    printLogo:       { type: Boolean, default: true },
    printQrCode:     { type: Boolean, default: true },
    lineSpacing:     { type: Number, default: 1 },

    // --- A4 Donation receipt formatting -------------------------------------
    // All of these are independent of the thermal printer settings above, so
    // the operator can keep a separate look for donation receipts printed on
    // regular A4 paper without affecting the thermal seva receipts.
    a4Title:              { type: String,  default: 'DONATION RECEIPT' },
    a4TitleAlignment:     { type: String,  default: 'left' },     // left | center | right
    a4OrgNameAlignment:   { type: String,  default: 'left' },     // left | center
    a4AccentColor:        { type: String,  default: '#b45309' },  // hex color
    a4FontSize:           { type: String,  default: 'normal' },   // small | normal | large
    a4BoldHeaders:        { type: Boolean, default: true },
    a4BoldAmount:         { type: Boolean, default: true },
    a4ShowLogo:           { type: Boolean, default: true },
    a4ShowAmountInWords:  { type: Boolean, default: true },
    a4ShowSignatureLine:  { type: Boolean, default: true },
    a4SignatureLabel:     { type: String,  default: 'Authorised Signatory' },
    a4Show80GTagline:     { type: Boolean, default: true },
    a4Header:             { type: String,  default: '' },         // extra letterhead text
    a4Footer:             { type: String,  default: '' },         // A4-specific footer block

    updatedBy:       { type: String },
  },
  { timestamps: true },
);

export const OrgSettings = model('OrgSettings', orgSettingsSchema);
