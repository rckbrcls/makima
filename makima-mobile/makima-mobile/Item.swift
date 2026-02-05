//
//  Item.swift
//  makima-mobile
//
//  Created by Erick Barcelos on 05/02/26.
//

import Foundation
import SwiftData

@Model
final class Item {
    var timestamp: Date
    
    init(timestamp: Date) {
        self.timestamp = timestamp
    }
}
