//
//  MobileShellViewModel.swift
//  makima-mobile
//

import Foundation

@Observable
final class MobileShellViewModel {
    var currentPage: MobilePage = .chat
    var chatVM: ChatViewModel?
    var approvalVM: ApprovalViewModel?
    var conversationsVM = ConversationsViewModel()

    var showAuth = false
    var showPair = false
    var showSettings = false

    var didInitialize = false
}
