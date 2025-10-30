import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SaveitemsService {
  constructor() {}

  // Get all saved items from localStorage
  getSavedList(): any[] {
    const data = localStorage.getItem('saveItems');
    return data ? JSON.parse(data) : [];
  }

  // Add, update, or remove item based on its existence and price
  addRemoveItems(item: any) {
    let saveItems = this.getSavedList();

    const existingIndex = saveItems.findIndex((i: any) => i._id === item._id);

    if (existingIndex === -1) {
      // Item not found – save it
      saveItems.push(item);
      console.log('✅ Product saved:', item);
    } else {
      const existingItem = saveItems[existingIndex];

      if (existingItem.final_price !== item.final_price) {
        // Update price
        saveItems[existingIndex].final_price = item.final_price;
        saveItems[existingIndex].discount_amount = item.discount_amount;
        console.log('🔁 Updated final price for:', item._id);
      } else {
        // Same price – remove the item
        saveItems.splice(existingIndex, 1);
        console.log('❌ Product removed:', item._id);
      }
    }

    // Save back to localStorage
    localStorage.setItem('saveItems', JSON.stringify(saveItems));
  }

  // Explicit remove item function
  removeItem(id: string) {
    let saveItems = this.getSavedList();

    const existingIndex = saveItems.findIndex((i: any) => i._id === id);

    if (existingIndex !== -1) {
      saveItems.splice(existingIndex, 1);
      console.log('❌ Product removed:', id);

      // Save back to localStorage
      localStorage.setItem('saveItems', JSON.stringify(saveItems));
    }
  }
}
